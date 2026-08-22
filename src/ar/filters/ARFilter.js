/**
 * ARFilter — Base Class for Modular AR Filters
 */

export class ARFilter {
  constructor(id, name, icon, category = 'General', description = '') {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.category = category;
    this.description = description;
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
  }

  update(frameData, faceGeometry, timestamp) {
    // Override in subclasses if physics/state update is needed
  }

  render(ctx, canvas, video, faceGeometry, timestamp) {
    // Default pass-through: Draw raw video feed
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  dispose() {
    this.isInitialized = false;
  }
}
