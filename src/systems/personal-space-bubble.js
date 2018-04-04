const invaderPos = new AFRAME.THREE.Vector3();
const bubblePos = new AFRAME.THREE.Vector3();

AFRAME.registerSystem("personal-space-bubble", {
  schema: {
    debug: { default: false }
  },

  init() {
    this.invaders = [];
    this.bubbles = [];
  },

  registerBubble(el) {
    this.bubbles.push(el);
  },

  unregisterBubble(el) {
    const index = this.bubbles.indexOf(el);

    if (index !== -1) {
      this.bubbles.splice(index, 1);
    }
  },

  registerInvader(invader) {
    NAF.utils.getNetworkedEntity(invader.el).then(networkedEl => {
      const owner = NAF.utils.getNetworkOwner(networkedEl);

      if (owner !== NAF.clientId) {
        this.invaders.push(invader);
      }
    });
  },

  unregisterInvader(invader) {
    const index = this.invaders.indexOf(invader);

    if (index !== -1) {
      this.invaders.splice(index, 1);
    }
  },

  tick() {
    // Update matrix positions once for each space bubble and space invader
    for (let i = 0; i < this.bubbles.length; i++) {
      this.bubbles[i].object3D.updateMatrixWorld(true);
    }

    for (let i = 0; i < this.invaders.length; i++) {
      this.invaders[i].el.object3D.updateMatrixWorld(true);
      this.invaders[i].setVisibility(true);
    }

    // Loop through all of the space bubbles (usually one)
    for (let i = 0; i < this.bubbles.length; i++) {
      const bubble = this.bubbles[i];

      bubblePos.setFromMatrixPosition(bubble.object3D.matrixWorld);

      const bubbleRadius = bubble.components["personal-space-bubble"].data.radius;

      // Hide the invader if inside the bubble
      for (let j = 0; j < this.invaders.length; j++) {
        const invader = this.invaders[j];

        invaderPos.setFromMatrixPosition(invader.el.object3D.matrixWorld);

        const distanceSquared = bubblePos.distanceToSquared(invaderPos);
        const radius = bubbleRadius + invader.data.radius;
        if (distanceSquared < radius * radius) {
          invader.setVisibility(false);
        }
      }
    }
  }
});

function createSphereGizmo(radius) {
  const geometry = new THREE.SphereBufferGeometry(radius, 10, 10);
  const wireframe = new THREE.WireframeGeometry(geometry);
  const line = new THREE.LineSegments(wireframe);
  line.material.opacity = 0.5;
  line.material.transparent = true;
  return line;
}

// TODO: we need to come up with a more generic way of doing this as this is very specific to our avatars.
AFRAME.registerComponent("space-invader-mesh", {
  schema: {
    meshSelector: { type: "string" }
  },
  init() {
    this.targetMesh = this.el.querySelector(this.data.meshSelector).object3DMap.skinnedmesh;
    console.log("target", this.targetMesh);
  }
});

function findInvderMesh(entity) {
  while (entity && !(entity.components && entity.components["space-invader-mesh"])) {
    entity = entity.parentNode;
  }
  return entity && entity.components["space-invader-mesh"].targetMesh;
}

AFRAME.registerComponent("personal-space-invader", {
  schema: {
    radius: { type: "number", default: 0.1 },
    useMaterial: { default: false },
    debug: { default: false }
  },
  init() {
    const system = this.el.sceneEl.systems["personal-space-bubble"];
    system.registerInvader(this);
    if (system.data.debug || this.data.debug) {
      this.el.object3D.add(createSphereGizmo(this.data.radius));
    }
    if (this.data.useMaterial) {
      const mesh = findInvderMesh(this.el);
      if (mesh) {
        this.targetMaterial = mesh.material;
      }
      console.log("invader mesh", this.targetMesh);
    }
  },

  update() {
    this.radiusSquared = this.data.radius * this.data.radius;
  },

  remove() {
    this.el.sceneEl.systems["personal-space-bubble"].unregisterInvader(this);
  },

  setVisibility(visible) {
    if (this.targetMaterial) {
      this.targetMaterial.opacity = visible ? 1 : 0.3;
      this.targetMaterial.transparent = !visible;
    } else {
      this.el.object3D.visible = visible;
    }
  }
});

AFRAME.registerComponent("personal-space-bubble", {
  schema: {
    radius: { type: "number", default: 0.8 },
    debug: { default: false }
  },
  init() {
    this.system.registerBubble(this.el);
    if (this.system.data.debug || this.data.debug) {
      this.el.object3D.add(createSphereGizmo(this.data.radius));
    }
  },

  update() {
    this.radiusSquared = this.data.radius * this.data.radius;
  },

  remove() {
    this.system.unregisterBubble(this.el);
  }
});
