/** @jsx createElementEntity */
import { createElementEntity } from "../utils/jsx-entity";
import { HyperbeamPageParams } from "../components/hyperbeam-page";
import { COLLISION_LAYERS } from "../constants";
import { FLOATY_OBJECT_FLAGS } from "../systems/floaty-object-system";

export function HyperbeamPagePrefab(params: HyperbeamPageParams) {
    return (
        <entity
            hyperbeamPage={params}
            cursorRaycastable
            remoteHoverTarget
            holdable
            holdableButton
            grabbable={{cursor: true, hand: true}}
            deletable
            rigidbody={{ collisionGroup: COLLISION_LAYERS.INTERACTABLES, collisionMask: COLLISION_LAYERS.HANDS }}
        />
    );
}