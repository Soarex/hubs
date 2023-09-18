import { defineQuery } from "bitecs";
import { Object3DTag } from "../bit-components";
import { HyperbeamPage } from "../components/hyperbeam-page";
import { HubsWorld } from "../app";
import * as THREE from "three"
import Hyperbeam, { HyperbeamEmbed, MouseEvent } from "@hyperbeam/web";


const hyperbeamPageQuery = defineQuery([HyperbeamPage, Object3DTag]);

const hyperbeamObjectMap = new Map();
let latestHyperbeamObjectId = 1;

const raycaster = new THREE.Raycaster();
let latestPointerPosition = {x: 0, y: 0}

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

function getPlaneIntersects(pointer: { x: number, y: number }, object: THREE.Object3D) {
    //@ts-ignore
    const camera = document.getElementById("viewing-camera").getObject3D("camera");

    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObject(object, false)
}

function processPointerEvent(e: PointerEvent, type: "mousedown" | "mousemove" | "mouseup", obj: THREE.Object3D, hb: HyperbeamEmbed, width: number, height: number) {
    const canvas = document.querySelector(".a-canvas") as HTMLCanvasElement

    latestPointerPosition = {
          x: (e.clientX / canvas.width) * 2 - 1,
          y: -(e.clientY / canvas.height) * 2 + 1
    }

    //@ts-ignore
    const camera = document.getElementById("viewing-camera").getObject3D("camera");

    raycaster.setFromCamera(latestPointerPosition, camera)
    const intersects = raycaster.intersectObject(obj, false)

    if (intersects.length > 0) {
        const vector = new THREE.Vector3().copy(intersects[0].point)

        obj.worldToLocal(vector)

        hb.sendEvent({
            type: type,
            x: vector.x / width + 0.5,
            y: -vector.y / height + 0.5,
            button: e.button
        })
    }
}

function processWheelEvent(e: WheelEvent, obj: THREE.Object3D, hb: HyperbeamEmbed) {
    //@ts-ignore
    const camera = document.getElementById("viewing-camera").getObject3D("camera");

    raycaster.setFromCamera(latestPointerPosition, camera)
    const intersects = raycaster.intersectObject(obj, false)

    if (intersects.length > 0) {
        const vector = new THREE.Vector3().copy(intersects[0].point)

        obj.worldToLocal(vector)

        hb.sendEvent({
            type: "wheel",
            deltaY: e.deltaY
        })
    }
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

              window.addEventListener("wheel", (e) => processWheelEvent(e, obj, hyperbeamObject.hyperbeamEmbed))
              window.addEventListener("pointermove", (e) => processPointerEvent(e, "mousemove", obj, hyperbeamObject.hyperbeamEmbed, HyperbeamPage.width[eid], HyperbeamPage.height[eid]))
              window.addEventListener("pointerup", (e) =>   processPointerEvent(e, "mouseup",   obj, hyperbeamObject.hyperbeamEmbed, HyperbeamPage.width[eid], HyperbeamPage.height[eid]))
              window.addEventListener("pointerdown", (e) => processPointerEvent(e, "mousedown", obj, hyperbeamObject.hyperbeamEmbed, HyperbeamPage.width[eid], HyperbeamPage.height[eid]))
          });
      }

      if(HyperbeamPage.hyperbeamObjectId[eid] <= 0)
          return;

      const hyperbeamObject = hyperbeamObjectMap.get(HyperbeamPage.hyperbeamObjectId[eid]);
      obj.material = new THREE.MeshBasicMaterial({map: hyperbeamObject.texture ,side: THREE.DoubleSide});
  });
}