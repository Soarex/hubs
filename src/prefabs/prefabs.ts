import { MediaLoaderParams } from "../inflators/media-loader";
import { CameraPrefab, CubeMediaFramePrefab } from "../prefabs/camera-tool";
import { MediaPrefab } from "../prefabs/media";
import { EntityDef } from "../utils/jsx-entity";
import { HyperbeamPagePrefab } from "./hyperbeam-page-prefab";

type CameraPrefabT = () => EntityDef;
type CubeMediaPrefabT = () => EntityDef;
type MediaPrefabT = (params: MediaLoaderParams) => EntityDef;

export type PrefabDefinition = {
  permission?: "spawn_camera";
  template: CameraPrefabT | CubeMediaPrefabT | MediaPrefabT;
};

export type PrefabName = "camera" | "cube" | "media" | "hyperbeam-page";

export const prefabs = new Map<PrefabName, PrefabDefinition>();
prefabs.set("camera", { permission: "spawn_camera", template: CameraPrefab });
prefabs.set("cube", { template: CubeMediaFramePrefab });
prefabs.set("media", { template: MediaPrefab });
prefabs.set("hyperbeam-page", { template: HyperbeamPagePrefab } );