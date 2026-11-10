import metadata from '../extension.json';
import { createPackageManifest } from './manifest.js';

// This repository is the scaffold for the Penrose Studio extension. It uses
// only the public ExtensionPackageSpec structural contract; optional SDK
// imports are shared by the host, never bundled or installed from npm.
//
// The placeholder card below proves the wiring end to end: tool-shelf action,
// canvas.creation, declarative inspector controls, one host Undo batch, and a
// pure SVG export path. Replace `diagramBody` and the canonical defaults with
// the .domain/.substance/.style document model in the next milestone.
const aspectId = `${metadata.id}.diagram`;
const insertDiagramCommand = `${metadata.id}:insert-diagram`;
const defaults = {
  title: 'Penrose Studio',
  body: '스캐폴드 도해입니다.\n.domain · .substance · .style 편집기는 다음 단계에서 구현합니다.',
  color: '#eef2ff',
};
const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const colorOf = value => /^#[a-f\d]{6}$/i.test(value) ? value : defaults.color;
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

// Paint order is not geometry: the host stacks every object on one z-axis
// (`core.stacking`) and puts newly created diagrams on top.
function derive(_props, id, view) {
  const transform = view.getCanonical(id, 'core.transform') ?? {};
  const bounds = view.getCanonical(id, 'core.bounds') ?? {};
  return {
    x: finite(transform.x, 0), y: finite(transform.y, 0),
    width: positive(bounds.width, 320), height: positive(bounds.height, 200),
    rotation: finite(transform.rotation, 0),
  };
}

function diagramBody(props, geometry) {
  const { width, height } = geometry;
  const inset = Math.min(16, width / 4, height / 4);
  // Literal text and a validated color are the only user inputs interpolated
  // into SVG. Geometry is local derived state, never written to the document.
  const lines = String(props.body ?? '').split(/\r?\n/).slice(0, Math.max(0, Math.floor((height - 84) / 20) + 1));
  const body = lines.map((line, index) => `<tspan x="${inset}" y="${74 + index * 20}">${escapeXml(line)}</tspan>`).join('');
  return `<rect x="0.5" y="0.5" width="${Math.max(0, width - 1)}" height="${Math.max(0, height - 1)}" rx="10" fill="${colorOf(props.color)}" stroke="#c7d2fe"/>
<rect x="${inset}" y="16" width="22" height="3" rx="1.5" fill="#4f46e5"/>
<svg width="${width}" height="${height}" overflow="hidden"><text x="${inset}" y="47" fill="#1e1b4b" font-family="system-ui, sans-serif" font-size="16" font-weight="600">${escapeXml(props.title ?? '')}</text><text fill="#4338ca" font-family="system-ui, sans-serif" font-size="12">${body}</text></svg>`;
}

const diagram = {
  id: aspectId,
  label: 'Penrose Studio 도해',
  summary: metadata.summary,
  defaults,
  textFields: ['title', 'body'],
  textSearchFields: ['title', 'body'],
  dependsOnCanonical: [aspectId, 'core.transform', 'core.bounds'],
  dependsOnComputed: [],
  derive,
  renderDom(content, props, geometry) {
    if (!geometry) return;
    // Only the content container is ours; the viewport owns outer geometry.
    content.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${geometry.height}" viewBox="0 0 ${geometry.width} ${geometry.height}" role="img" aria-label="${escapeXml(props.title ?? 'Penrose Studio 도해')}" style="display:block;user-select:none;pointer-events:none">${diagramBody(props, geometry)}</svg>`;
  },
  renderSvg(props, geometry) {
    if (!geometry) return { svg: '' };
    const { x, y, width, height, rotation } = geometry;
    return {
      svg: `<g transform="translate(${x},${y}) rotate(${rotation * 180 / Math.PI},${width / 2},${height / 2})">${diagramBody(props, geometry)}</g>`,
    };
  },
  ui: {
    controls: [
      { id: 'diagram-title', kind: 'text', field: 'title', label: '제목', placement: 'inspector' },
      { id: 'diagram-body', kind: 'text', field: 'body', label: '설명', placement: 'inspector' },
      { id: 'diagram-color', kind: 'color', field: 'color', label: '배경색', placement: 'inspector' },
    ],
  },
};

export default {
  ...createPackageManifest(metadata),
  summary: metadata.summary,
  aspects: [diagram],
  ui: {
    controls: [{ id: 'insert-diagram', kind: 'action', label: 'Penrose Studio 도해 추가', icon: 'document', commandSymbol: insertDiagramCommand, placement: 'tool-shelf', requiresSelection: false }],
  },
  activate(context) {
    const creation = context.services.get('canvas.creation');
    if (!creation) throw new Error('Penrose Studio에는 canvas.creation 호스트 서비스가 필요합니다.');
    // Activation adds behavior only; installation never creates document data.
    let active = true;
    const insertDiagram = () => {
      if (!active) throw new Error('Penrose Studio 확장이 비활성화되었습니다. 공개 API를 다시 조회하세요.');
      return creation.create({ caller: insertDiagramCommand, aspects: { [aspectId]: { ...defaults } }, width: 320, height: 200 });
    };
    const offCommand = context.commands.register({
      id: insertDiagramCommand,
      title: 'Penrose Studio 도해 추가',
      summary: '현재 캔버스 중앙에 스캐폴드 도해를 추가합니다.',
      shortcutScope: 'canvas',
      run: insertDiagram,
    });
    return { api: Object.freeze({ insertDiagram }), dispose() { if (!active) return; active = false; offCommand(); } };
  },
};
