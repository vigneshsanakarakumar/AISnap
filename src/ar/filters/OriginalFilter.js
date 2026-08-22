import { ARFilter } from './ARFilter.js';

export class OriginalFilter extends ARFilter {
  constructor() {
    super('original', 'Original', '📷', 'Standard', 'Raw sensor camera feed without modifications');
  }

  render(ctx, canvas, video) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
}
