type BoxType = 'text' | 'image' | 'svg' | 'canvas' | 'icon';

export interface ContentBox {
  type: BoxType;
  node: Node;
  rect: DOMRect;
}

export function getAllContentBoxes(container: Element, drawDebugSvg: boolean = false): ContentBox[] {
  if (!container) {
    console.warn('getAllContentBoxes: container is null or undefined.');
    return [];
  }

  const boxes: ContentBox[] = [];

  // === 收集文本节点 ===
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node) =>
        node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  );

  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rectList = range.getClientRects();

    for (const rect of Array.from(rectList)) {
      boxes.push({
        type: 'text',
        node: textNode,
        rect
      });
    }
  }

  // === 图片 ===
  container.querySelectorAll('img').forEach(img => {
    const rect = img.getBoundingClientRect();
    boxes.push({type: 'image', node: img, rect});
  });

  // === SVG 图形 ===
  container.querySelectorAll('svg').forEach(svg => {
    const rect = svg.getBoundingClientRect();
    boxes.push({type: 'svg', node: svg, rect});
  });

  // === Canvas ===
  container.querySelectorAll('canvas').forEach(canvas => {
    const rect = canvas.getBoundingClientRect();
    boxes.push({type: 'canvas', node: canvas, rect});
  });

  // === 图标字体类元素（常见icon库）===
  const iconSelectors = [
    'i[class*="icon"]',
    'i[class*="fa"]',
    'span.material-icons',
    '[class*="icon-"]',
    '[class*="fa-"]'
  ];
  container.querySelectorAll<HTMLElement>(iconSelectors.join(',')).forEach(icon => {
    const rect = icon.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      boxes.push({type: 'icon', node: icon, rect});
    }
  });

  if (drawDebugSvg) {
    drawBoxesOverlay(boxes);
  }

  return boxes;
};


// === 可视化 overlay ===
function drawBoxesOverlay(boxes: ContentBox[]) {
  const oldOverlay = document.getElementById('__content-box-debug-overlay__');
  if (oldOverlay) oldOverlay.remove();

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('id', '__content-box-debug-overlay__');
  Object.assign(svg.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '9999',
    pointerEvents: 'none'
  });

  const colorMap: Record<BoxType, string> = {
    text: 'rgba(0, 128, 255, 0.3)',
    image: 'rgba(255, 128, 0, 0.3)',
    svg: 'rgba(0, 200, 0, 0.3)',
    canvas: 'rgba(200, 0, 200, 0.3)',
    icon: 'rgba(255, 0, 0, 0.3)'
  };

  const strokeMap: Record<BoxType, string> = {
    text: '#0077ff',
    image: '#ff6600',
    svg: '#00aa00',
    canvas: '#aa00aa',
    icon: '#cc0000'
  };

  boxes.forEach(({rect, type}) => {
    const box = document.createElementNS(svgNS, 'rect');
    box.setAttribute('x', `${rect.left + window.scrollX}`);
    box.setAttribute('y', `${rect.top + window.scrollY}`);
    box.setAttribute('width', `${rect.width}`);
    box.setAttribute('height', `${rect.height}`);
    box.setAttribute('fill', colorMap[type] || 'rgba(0,0,0,0.2)');
    box.setAttribute('stroke', strokeMap[type] || '#000');
    box.setAttribute('stroke-width', '1');
    svg.appendChild(box);
  });

  document.body.appendChild(svg);
}

