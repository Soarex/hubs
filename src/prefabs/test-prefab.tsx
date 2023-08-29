/** @jsx createElementEntity */
import { createElementEntity } from "../utils/jsx-entity";
import { TestComponentParams } from "../components/test-component";

export function TestPrefab(params: TestComponentParams) {
    return (
        <entity
            test={params}
        />
    );
}