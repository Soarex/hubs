import {
  AsyncNode,
  Engine,
  EventEmitter,
  IGraphApi,
  NodeCategory,
  NodeDescription,
  NodeDescription2,
  Socket,
  SocketsList,
  makeEventNodeDefinition,
  makeFlowNodeDefinition,
  makeFunctionNodeDefinition,
  makeInNOutFunctionDesc
} from "@oveddan-behave-graph/core";
import { definitionListToMap } from "./utils";
import { EntityID, Networked, NetworkedBehaviorData, NetworkedBehavior, Owned } from "../../bit-components";
import { HubsWorld } from "../../app";
import { entityExists, hasComponent } from "bitecs";
import { pendingNetworkEvents } from "../networking";
import { ClientID, NetworkEventMessage } from "../../utils/networking-types";
import { takeOwnership } from "../../utils/take-ownership";

export const onCustomNetworkEvent = new EventEmitter<NetworkEventMessage>();

type NetworkEventData = {
  callback?: (target: NetworkEventMessage) => void;
};

export class TakeSoftOwnership extends AsyncNode {
  public static Description = new NodeDescription2({
    typeName: "networking/takeSoftOwnership",
    category: "Networking",
    label: "Take Ownership",
    factory: (description, graph) => new TakeSoftOwnership(description, graph)
  });

  constructor(description: NodeDescription, graph: IGraphApi) {
    super(
      description,
      graph,
      [new Socket("flow", "flow"), new Socket("entity", "entity")],
      [new Socket("flow", "success"), new Socket("flow", "error")]
    );
  }

  private callPending = false;

  triggered(engine: Engine, _triggeringSocketName: string, finished: () => void) {
    if (this.callPending) {
      return;
    }

    this.callPending = true;

    const world = this.graph.getDependency("world") as HubsWorld;
    const entity = this.readInput("entity") as EntityID;

    takeOwnership(world, entity);
    setTimeout(() => {
      if (!this.callPending) return;
      this.callPending = false;
      if (entityExists(world, entity) && hasComponent(world, Owned, entity)) {
        engine.commitToNewFiber(this, "success");
      } else {
        engine.commitToNewFiber(this, "error");
      }
      finished();
    }, 1000);
  }

  dispose() {
    this.callPending = false;
  }
}

export const NetworkingNodes = definitionListToMap([
  TakeSoftOwnership.Description,
  makeInNOutFunctionDesc({
    name: "networking/isMine",
    label: "Is Entity Mine",
    category: "Networking" as NodeCategory,
    in: [{ entity: "entity" }],
    out: [{ result: "boolean" }],
    exec: (entity: EntityID) => {
      return hasComponent(APP.world, Owned, entity);
    }
  }),
  makeInNOutFunctionDesc({
    name: "networking/isOwner",
    label: "Is Entity Owner",
    category: "Networking" as NodeCategory,
    in: [{ player: "player" }, { entity: "entity" }],
    out: [{ result: "boolean" }],
    exec: (player: ClientID, entity: EntityID) => {
      return Networked.owner[entity] === APP.getSid(player);
    }
  }),
  makeInNOutFunctionDesc({
    name: "networking/isOwned",
    label: "Is Entity Owned",
    category: "Networking" as NodeCategory,
    in: [{ entity: "entity" }],
    out: [{ result: "boolean" }],
    exec: (entity: EntityID) => {
      return Networked.owner[entity] !== APP.getSid("reticulum") && !hasComponent(APP.world, Owned, entity);
    }
  }),
  makeInNOutFunctionDesc({
    name: "networking/getOwner",
    label: "Get Entity Owner",
    category: "Networking" as NodeCategory,
    in: [{ entity: "entity" }],
    out: [{ player: "player" }],
    exec: (entity: EntityID) => {
      const ownerSid = Networked.owner[entity];
      return APP.sid2str.get(ownerSid);
    }
  }),
  makeFlowNodeDefinition({
    typeName: "networkedVariable/set",
    category: "Components" as any,
    label: "Networked Variable Set",
    configuration: {
      target: {
        valueType: "entity"
      },
      prop_name: {
        valueType: "string"
      },
      prop_type: {
        valueType: "string"
      }
    },
    in: configuration => {
      const type = configuration.prop_type || "string";
      const name = configuration.prop_name || "prop";

      const sockets: SocketsList = [
        {
          key: "flow",
          valueType: "flow"
        },
        {
          key: type,
          valueType: type,
          label: name
        }
      ];

      return sockets;
    },
    initialState: undefined,
    out: { flow: "flow" },
    triggered: ({ read, commit, configuration }) => {
      const entity = configuration.target as EntityID;
      const name = configuration.prop_name as string;
      const type = configuration.prop_type as string;

      const data = NetworkedBehaviorData.get(entity) || new Map();
      const value = read(type);
      data.set(name, value);
      NetworkedBehaviorData.set(entity, data);

      commit("flow");
    }
  }),
  makeFunctionNodeDefinition({
    typeName: "networkedVariable/get",
    category: "Components" as any,
    label: "Get",
    configuration: {
      target: {
        valueType: "entity"
      },
      prop_name: {
        valueType: "string"
      },
      prop_type: {
        valueType: "string"
      }
    },
    in: {},
    out: configuration => {
      const type = configuration.prop_type || "string";
      const name = configuration.prop_name || "prop";

      const result: SocketsList = [
        {
          key: type,
          valueType: type,
          label: name
        }
      ];

      return result;
    },
    exec: ({ write, configuration }) => {
      const entity = configuration.target as EntityID;
      const name = configuration.prop_name as string;
      const type = configuration.prop_type || "string";

      if (NetworkedBehaviorData.has(entity)) {
        const data = NetworkedBehaviorData.get(entity)!;
        if (data.has(name)) {
          write(type, data.get(name));
        }
      }
    }
  })
]);