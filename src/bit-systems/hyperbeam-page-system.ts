import { addComponent, defineQuery, removeComponent } from "bitecs";
import { Object3DTag, Pinned } from "../bit-components";
import { Focused, HyperbeamPage } from "../components/hyperbeam-page";
import { getScene, HubsWorld } from "../app";
import * as THREE from "three"
import Hyperbeam, { HyperbeamEmbed, MouseEvent } from "@hyperbeam/web";


const hyperbeamPageQuery = defineQuery([HyperbeamPage, Object3DTag]);

const hyperbeamObjectMap = new Map();
let latestHyperbeamObjectId = 1;

const raycaster = new THREE.Raycaster();
let latestPointerPosition = {x: 0, y: 0}
let latestPointerButton = 0
let latestPointerEvent : "mousedown" | "mousemove" | "mouseup" | null = null
let latestWheelDelta = 0.0

window.addEventListener("wheel", (e) => handleWheelEvent(e))
window.addEventListener("pointermove", (e) => handlePointerEvent(e, "mousemove"))
window.addEventListener("pointerup", (e) =>   handlePointerEvent(e, "mouseup"))
window.addEventListener("pointerdown", (e) => handlePointerEvent(e, "mousedown"))

async function getUrl() {
    let embedURL = "" // Running locally and you have an embed URL? Set it here
    if (embedURL === "") {
        const room = location.pathname.substring(1)
        const req = await fetch("https://demo-api.tutturu.workers.dev/" + room)
        if (req.status >= 400) {
            alert("We are out of demo servers! Visit hyperbeam.dev to get your own API key")
            return
        }
        const body = await req.json()
        if (body.room !== room) {
            history.replaceState(null, "", "/" + body.room + location.search)
        }
        return body.url
    }
}
async function getHyperbeamObject() {
    const embedURL = await getUrl();

    const texture = new THREE.Texture();
    texture.flipY = true;
    texture.generateMipmaps = false;

    const hbContainer = document.createElement('div');
    console.log(`Connecting to: ${embedURL}`);

    const hb = await Hyperbeam(hbContainer, embedURL, {
        frameCb: (frame) => {
            if (frame.constructor === HTMLVideoElement) {
                frame.width = frame.videoWidth
                frame.height = frame.videoHeight
            }

            texture.image = frame
            texture.needsUpdate = true
        },
        audioTrackCb: (track) => {}
    })

    return { texture: texture, hyperbeamEmbed: hb};
}

function handlePointerEvent(e: PointerEvent, type: "mousedown" | "mousemove" | "mouseup") {
    const canvasRect = document.querySelector(".a-canvas")?.getBoundingClientRect()

    if(canvasRect == null)
        return

    latestPointerPosition = {
        x: (e.clientX / canvasRect.width) * 2 - 1,
        y: -(e.clientY / canvasRect.height) * 2 + 1
    }

    latestPointerButton = e.button

    latestPointerEvent = type
}
function handleWheelEvent(e: WheelEvent) {
    latestWheelDelta = e.deltaY
}

function getIntersectionPoint(obj: THREE.Object3D, camera: THREE.Camera, localSpace = true) {
    raycaster.setFromCamera(latestPointerPosition, camera)
    const intersections = raycaster.intersectObject(obj, false)

    if(intersections.length == 0)
        return null

    const intersectionPoint = new THREE.Vector3().copy(intersections[0].point)

    if(localSpace)
        obj.worldToLocal(intersectionPoint)

    return intersectionPoint
}
function processEvents(entityId: number, hyperbeamPlane: THREE.Mesh) {
    //@ts-ignore
    const camera = document.getElementById("viewing-camera").getObject3D("camera")

    const hyperbeamObject = hyperbeamObjectMap.get(HyperbeamPage.hyperbeamObjectId[entityId])
    const hyperbeamPageWidth = HyperbeamPage.width[entityId]
    const hyperbeamPageHeight = HyperbeamPage.height[entityId]

    let point
    if ((point = getIntersectionPoint(hyperbeamPlane, camera)) != null) {
        if(latestPointerEvent != null) {
            hyperbeamObject.hyperbeamEmbed.sendEvent({
                type: latestPointerEvent,
                x: point.x / hyperbeamPageWidth + 0.5,
                y: -point.y / hyperbeamPageHeight + 0.5,
                button: latestPointerButton
            })
        }

        hyperbeamObject.hyperbeamEmbed.sendEvent({
            type: "wheel",
            deltaY: latestWheelDelta
        })
    }
}
function resetInputs() {
    latestWheelDelta = 0
    latestPointerButton = 0
    latestPointerEvent = null
}

export function HyperbeamPageSystem(world: HubsWorld) {
    hyperbeamPageQuery(world).forEach(eid => {
        const obj = world.eid2obj.get(eid)! as THREE.Mesh;

        if(HyperbeamPage.hyperbeamObjectId[eid] == 0) {
            HyperbeamPage.hyperbeamObjectId[eid] = -1;

            getHyperbeamObject().then(hyperbeamObject => {
                HyperbeamPage.hyperbeamObjectId[eid] = latestHyperbeamObjectId++;
                hyperbeamObjectMap.set(HyperbeamPage.hyperbeamObjectId[eid], hyperbeamObject);

                obj.material = new THREE.MeshBasicMaterial({map: hyperbeamObject.texture ,side: THREE.DoubleSide});
            });
        }

        if(HyperbeamPage.hyperbeamObjectId[eid] <= 0)
            return;

        processEvents(eid, obj)
    })

    resetInputs()
}