/** @jsx createElementEntity */
import { createElementEntity } from "../utils/jsx-entity";
import { HyperbeamPageParams } from "../components/hyperbeam-page";
import { COLLISION_LAYERS } from "../constants";
import { FLOATY_OBJECT_FLAGS } from "../systems/floaty-object-system";
import { prefabs } from "./prefabs";

export function HyperbeamPagePrefab(params: HyperbeamPageParams) {
    return (
        <entity
            name="Hyperbeam Page"
            hyperbeamPage={params}
            cursorRaycastable
            remoteHoverTarget
            networked
            networkedTransform
            grabbable={{cursor: true, hand: true}}
            deletable
            destroyAtExtremeDistance
            floatyObject={{
                flags: FLOATY_OBJECT_FLAGS.MODIFY_GRAVITY_ON_RELEASE,
                releaseGravity: 0
            }}
            rigidbody={{ collisionGroup: COLLISION_LAYERS.INTERACTABLES, collisionMask: COLLISION_LAYERS.HANDS }}
        />
    );
}