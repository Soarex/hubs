/** @jsx createElementEntity */
import { createElementEntity } from "../utils/jsx-entity";
import { TestComponentParams } from "../components/test-component";
import { COLLISION_LAYERS } from "../constants";
import { FLOATY_OBJECT_FLAGS } from "../systems/floaty-object-system";

export function TestPrefab(params: TestComponentParams) {
    return (
        <entity
            test={params}
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