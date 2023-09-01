import { defineQuery } from "bitecs";
import { Object3DTag } from "../bit-components";
import { HyperbeamPage } from "../components/hyperbeam-page";
import { HubsWorld } from "../app";
import * as THREE from "three"
import Hyperbeam from "@hyperbeam/web";

const hyperbeamPageQuery = defineQuery([HyperbeamPage, Object3DTag]);

const hyperbeamObjectMap = new Map();
let latestHyperbeamObjectId = 1;

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

async function GetHyperbeamObject() {
    const embedURL = await getUrl();

    const texture = new THREE.Texture();
    texture.flipY = true;
    texture.generateMipmaps = false;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0xFF889B, 1)
    renderer.setSize(window.innerWidth, window.innerHeight)

    const hbContainer = document.createElement('div');
    console.log(`Connecting to: ${embedURL}`);

    const hb = await Hyperbeam(hbContainer, embedURL, {
        frameCb: (frame) => {
            if (texture.image === null) {
                if (frame.constructor === HTMLVideoElement) {
                    frame.width = frame.videoWidth
                    frame.height = frame.videoHeight
                }

                texture.image = frame
                texture.needsUpdate = true
            } else {
                renderer.copyTextureToTexture(new THREE.Vector2(0, 0), new THREE.Texture(frame as HTMLVideoElement), texture)
            }
        },
        audioTrackCb: (track) => {}
    })

    return { texture: texture, hyperbeamEmbed: hb};
}

export function HyperbeamPageSystem(world: HubsWorld) {
  hyperbeamPageQuery(world).forEach(eid => {
      if(HyperbeamPage.hyperbeamObjectId[eid] == 0) {
          HyperbeamPage.hyperbeamObjectId[eid] = -1;

          GetHyperbeamObject().then(hyperbeamObject => {
              HyperbeamPage.hyperbeamObjectId[eid] = latestHyperbeamObjectId++;
              hyperbeamObjectMap.set(HyperbeamPage.hyperbeamObjectId[eid], hyperbeamObject);

              const obj = world.eid2obj.get(eid)! as THREE.Mesh;

              obj.material = new THREE.MeshBasicMaterial({map: hyperbeamObject.texture ,side: THREE.DoubleSide});
          });
      }
  });
}