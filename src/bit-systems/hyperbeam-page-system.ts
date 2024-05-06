import { addComponent, defineQuery, removeComponent } from "bitecs";
import { Object3DTag } from "../bit-components";
import { Focused, HyperbeamPage } from "../components/hyperbeam-page";
import { getScene, HubsWorld } from "../app";
import * as THREE from "three";
import Hyperbeam, { HyperbeamEmbed } from "@hyperbeam/web";
import { createNetworkedEntity } from "../utils/create-networked-entity";
import { Object3D } from "three";

export type HyperbeamObject = {
  texture: THREE.Texture;
  hyperbeamEmbed: HyperbeamEmbed;
};

type Event = {
  type: "mousedown" | "mousemove" | "mouseup";
  position: { x: number; y: number };
  button: number;
};

const hyperbeamPageQuery = defineQuery([HyperbeamPage, Object3DTag]);

const hyperbeamObjectMap = new Map<number, HyperbeamObject>();
let latestHyperbeamObjectId = 1;

const raycaster = new THREE.Raycaster();
let latestPointerPosition = { x: 0, y: 0 };
let latestPointerButton = 0;
let latestPointerEvent: "mousedown" | "mousemove" | "mouseup" | null = null;
let latestWheelDelta = 0.0;

const unprocessedEvents = new Array<Event>();

let controlKeyPressed = false;

window.addEventListener("wheel", e => handleWheelEvent(e));
window.addEventListener("pointermove", e => handlePointerEvent(e, "mousemove"));
window.addEventListener("pointerup", e => handlePointerEvent(e, "mouseup"));
window.addEventListener("pointerdown", e => handlePointerEvent(e, "mousedown"));

document.addEventListener("keydown", function (event) {
  if (event.ctrlKey) controlKeyPressed = true;
});

document.addEventListener("keyup", function (event) {
  if (!event.ctrlKey) controlKeyPressed = false;
});

async function getUrl() {
  const embedURL = ""; // Running locally and you have an embed URL? Set it here
  if (embedURL === "") {
    const room = location.pathname.substring(1);
    const req = await fetch("https://demo-api.tutturu.workers.dev/" + room);
    if (req.status >= 400) {
      alert("We are out of demo servers! Visit hyperbeam.dev to get your own API key");
      return;
    }
    const body = await req.json();
    if (body.room !== room) {
      history.replaceState(null, "", "/" + body.room + location.search);
    }
    return body.url;
  }
}
async function getHyperbeamObject() {
  const embedURL = await getUrl();

  const texture = new THREE.Texture();
  texture.flipY = true;
  texture.generateMipmaps = false;

  const hbContainer = document.createElement("div");
  console.log(`Connecting to: ${embedURL}`);

  const hb = await Hyperbeam(hbContainer, embedURL, {
    frameCb: frame => {
      if (frame.constructor === HTMLVideoElement) {
        frame.width = frame.videoWidth;
        frame.height = frame.videoHeight;
      }

      texture.image = frame;
      texture.needsUpdate = true;
    },
    audioTrackCb: track => {}
  });

  const res: HyperbeamObject = { texture: texture, hyperbeamEmbed: hb };

  return res;
}

function handlePointerEvent(e: PointerEvent, type: "mousedown" | "mousemove" | "mouseup") {
  const canvasRect = document.querySelector(".a-canvas")?.getBoundingClientRect();

  if (canvasRect == null) return;

  latestPointerPosition = {
    x: (e.clientX / canvasRect.width) * 2 - 1,
    y: -(e.clientY / canvasRect.height) * 2 + 1
  };

  latestPointerButton = e.button;

  latestPointerEvent = type;

  const event = {
    position: latestPointerPosition,
    button: latestPointerButton,
    type: latestPointerEvent
  };

  unprocessedEvents.push(event);
}
function handleWheelEvent(e: WheelEvent) {
  latestWheelDelta = e.deltaY;
}

function getIntersectionPoint(obj: THREE.Object3D, camera: THREE.Camera, localSpace = true) {
  raycaster.setFromCamera(latestPointerPosition, camera);
  const intersections = raycaster.intersectObject(obj, false);

  if (intersections.length == 0) return null;

  const intersectionPoint = new THREE.Vector3().copy(intersections[0].point);

  if (localSpace) obj.worldToLocal(intersectionPoint);

  return intersectionPoint;
}
function processEvents(entityId: number, hyperbeamPlane: THREE.Mesh) {
  //@ts-ignore
  const camera = document.getElementById("viewing-camera").getObject3D("camera");

  const hyperbeamObject = hyperbeamObjectMap.get(HyperbeamPage.hyperbeamObjectId[entityId])!;
  const hyperbeamPageWidth = HyperbeamPage.width[entityId];
  const hyperbeamPageHeight = HyperbeamPage.height[entityId];

  let point: THREE.Vector3 | null;
  if ((point = getIntersectionPoint(hyperbeamPlane, camera)) != null) {
    for (const i in unprocessedEvents) {
      hyperbeamObject.hyperbeamEmbed.sendEvent({
        type: unprocessedEvents[i].type,
        x: point.x / hyperbeamPageWidth + 0.5,
        y: -point.y / hyperbeamPageHeight + 0.5,
        button: unprocessedEvents[i].button
      });
    }

    hyperbeamObject.hyperbeamEmbed.sendEvent({
      type: "wheel",
      deltaY: latestWheelDelta
    });

    if (latestPointerEvent === "mousedown") addComponent(APP.world, Focused, entityId);
  } else if (latestPointerEvent === "mousedown") {
    removeComponent(APP.world, Focused, entityId);
  }
}
function resetInputs() {
  latestWheelDelta = 0;
  latestPointerButton = 0;
  latestPointerEvent = null;

  while (unprocessedEvents.length > 0) unprocessedEvents.pop();
}

export function HyperbeamPageSystem(world: HubsWorld) {
  hyperbeamPageQuery(world).forEach(eid => {
    const obj = world.eid2obj.get(eid)! as THREE.Mesh;

    if (HyperbeamPage.hyperbeamObjectId[eid] == 0) {
      HyperbeamPage.hyperbeamObjectId[eid] = -1;

      getHyperbeamObject().then(hyperbeamObject => {
        HyperbeamPage.hyperbeamObjectId[eid] = latestHyperbeamObjectId++;
        hyperbeamObjectMap.set(HyperbeamPage.hyperbeamObjectId[eid], hyperbeamObject);

        obj.material = new THREE.MeshBasicMaterial({ map: hyperbeamObject.texture, side: THREE.DoubleSide });
      });
    }

    if (HyperbeamPage.hyperbeamObjectId[eid] <= 0) return;

    processEvents(eid, obj);
  });

  resetInputs();
}

document.addEventListener("keydown", function (event) {
  if (event.key === "y") {
    console.log("Adding Test");

    getScene().then(scene => {
      const eid = createNetworkedEntity(APP.world, "hyperbeam-page", { y: 0.05 }); //renderAsEntity(APP.world, HyperbeamPagePrefab({y: 0.05}));
      const obj = APP.world.eid2obj.get(eid);

      if (obj instanceof Object3D)
        scene.add(obj);
    });
  }
});
