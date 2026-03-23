const STORAGE_KEY = "lauinger-optik-state-v1";
const THEME_STORAGE_KEY = "lauinger-optik-theme-v1";
const LANGUAGE_STORAGE_KEY = "lauinger-optik-language-v1";
const EPSILON = 1e-9;
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 420;
const AXIS_Y = SVG_HEIGHT / 2;
const PAD_X = 76;
const PAD_Y = 42;
const I18N = window.APP_I18N;

const defaultState = {
  object: {
    distance: 320,
    height: 28,
  },
  elements: [
    {
      id: "lens-1",
      type: "lens",
      label: "",
      autoLabel: true,
      position: 110,
      power: 5.5,
      diameter: 48,
    },
    {
      id: "aperture-1",
      type: "aperture",
      label: "",
      autoLabel: true,
      position: 190,
      diameter: 24,
    },
    {
      id: "lens-2",
      type: "lens",
      label: "",
      autoLabel: true,
      position: 330,
      power: 3.25,
      diameter: 44,
    },
  ],
};

let state = loadState();
let language = loadLanguage();
state = sanitizeState(state);
let counters = buildCounters(state.elements);

const refs = {
  metaDescription: document.querySelector("#metaDescription"),
  heroEyebrow: document.querySelector("#heroEyebrow"),
  languageSwitchCaption: document.querySelector("#languageSwitchCaption"),
  languageSelect: document.querySelector("#languageSelect"),
  themeToggleCaption: document.querySelector("#themeToggleCaption"),
  themeToggleButton: document.querySelector("#themeToggleButton"),
  themeToggleLabel: document.querySelector("#themeToggleLabel"),
  heroTitle: document.querySelector("#heroTitle"),
  brandLink: document.querySelector("#brandLink"),
  heroText: document.querySelector("#heroText"),
  controlKicker: document.querySelector("#controlKicker"),
  controlTitle: document.querySelector("#controlTitle"),
  controlCopy: document.querySelector("#controlCopy"),
  objectSectionTitle: document.querySelector("#objectSectionTitle"),
  objectInputUnit: document.querySelector("#objectInputUnit"),
  objectDistanceLabel: document.querySelector("#objectDistanceLabel"),
  objectHeightLabel: document.querySelector("#objectHeightLabel"),
  elementsSectionTitle: document.querySelector("#elementsSectionTitle"),
  objectDistance: document.querySelector("#objectDistance"),
  objectHeight: document.querySelector("#objectHeight"),
  elementCount: document.querySelector("#elementCount"),
  elementList: document.querySelector("#elementList"),
  addLensButton: document.querySelector("#addLensButton"),
  addApertureButton: document.querySelector("#addApertureButton"),
  resetButton: document.querySelector("#resetButton"),
  resultsKicker: document.querySelector("#resultsKicker"),
  resultsTitle: document.querySelector("#resultsTitle"),
  resultsCopy: document.querySelector("#resultsCopy"),
  visualKicker: document.querySelector("#visualKicker"),
  visualTitle: document.querySelector("#visualTitle"),
  visualCopy: document.querySelector("#visualCopy"),
  imageDiagramTitle: document.querySelector("#imageDiagramTitle"),
  imageDiagramBadge: document.querySelector("#imageDiagramBadge"),
  downloadImageRayButton: document.querySelector("#downloadImageRayButton"),
  heroStats: document.querySelector("#heroStats"),
  apertureDiagramTitle: document.querySelector("#apertureDiagramTitle"),
  apertureDiagramBadge: document.querySelector("#apertureDiagramBadge"),
  downloadApertureRayButton: document.querySelector("#downloadApertureRayButton"),
  calcKicker: document.querySelector("#calcKicker"),
  calcTitle: document.querySelector("#calcTitle"),
  geometryKicker: document.querySelector("#geometryKicker"),
  geometryTitle: document.querySelector("#geometryTitle"),
  summaryCards: document.querySelector("#summaryCards"),
  calcSteps: document.querySelector("#calcSteps"),
  distanceSummary: document.querySelector("#distanceSummary"),
  notes: document.querySelector("#notes"),
  imageRaySvg: document.querySelector("#imageRaySvg"),
  apertureRaySvg: document.querySelector("#apertureRaySvg"),
};

initialize();

function initialize() {
  applyLanguage(language);
  applyTheme(loadTheme());
  syncObjectInputs();
  renderControls();
  renderOutputs();
  bindEvents();
}

function bindEvents() {
  refs.languageSelect.addEventListener("change", (event) => {
    language = normalizeLanguage(event.target.value);
    applyLanguage(language);
    saveLanguage(language);
    renderControls();
    renderOutputs();
  });

  refs.themeToggleButton.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveTheme(nextTheme);
  });

  refs.downloadImageRayButton.addEventListener("click", () => {
    downloadSvgAsPng(refs.imageRaySvg, "image-ray-path.png");
  });

  refs.downloadApertureRayButton.addEventListener("click", () => {
    downloadSvgAsPng(refs.apertureRaySvg, "aperture-ray-path.png");
  });

  refs.objectDistance.addEventListener("input", (event) => {
    state.object.distance = toNumber(event.target.value, state.object.distance);
    saveState();
    renderOutputs();
  });

  refs.objectHeight.addEventListener("input", (event) => {
    state.object.height = toNumber(event.target.value, state.object.height);
    saveState();
    renderOutputs();
  });

  refs.addLensButton.addEventListener("click", () => {
    state.elements.push(createLens());
    sortElementsInState();
    saveState();
    renderControls();
    renderOutputs();
  });

  refs.addApertureButton.addEventListener("click", () => {
    state.elements.push(createAperture());
    sortElementsInState();
    saveState();
    renderControls();
    renderOutputs();
  });

  refs.resetButton.addEventListener("click", () => {
    state = clone(defaultState);
    counters = buildCounters(state.elements);
    saveState();
    syncObjectInputs();
    renderControls();
    renderOutputs();
  });

  refs.elementList.addEventListener("input", (event) => {
    const target = event.target;
    const elementId = target.dataset.id;
    const field = target.dataset.field;

    if (!elementId || !field) {
      return;
    }

    const element = state.elements.find((entry) => entry.id === elementId);
    if (!element) {
      return;
    }

    if (field === "label") {
      element.label = target.value;
      element.autoLabel = target.value.trim() === "";
    } else {
      element[field] = toNumber(target.value, element[field]);
    }

    saveState();
    renderOutputs();
  });

  refs.elementList.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.field === "position") {
      sortElementsInState();
      saveState();
      renderControls();
      renderOutputs();
    }
  });

  refs.elementList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button) {
      return;
    }

    const elementId = button.dataset.remove;
    state.elements = state.elements.filter((element) => element.id !== elementId);
    saveState();
    renderControls();
    renderOutputs();
  });
}

function t(key, params = {}) {
  const fallbackLanguage = I18N.defaultLanguage;
  const translationSet = I18N.translations[language] || I18N.translations[fallbackLanguage];
  let template = translationSet[key];

  if (template === undefined) {
    template = I18N.translations[fallbackLanguage][key];
  }

  if (typeof template !== "string") {
    return key;
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => params[token] ?? "");
}

function normalizeLanguage(value) {
  return Object.prototype.hasOwnProperty.call(I18N.languages, value) ? value : I18N.defaultLanguage;
}

function applyLanguage(nextLanguage) {
  language = normalizeLanguage(nextLanguage);
  document.documentElement.lang = language;
  document.title = t("documentTitle");
  refs.metaDescription.setAttribute("content", t("metaDescription"));
  refs.languageSelect.value = language;
  refs.languageSelect.setAttribute("aria-label", t("languageSelectAria"));
  refs.heroEyebrow.textContent = t("heroEyebrow");
  refs.languageSwitchCaption.textContent = t("languageSwitchCaption");
  refs.themeToggleCaption.textContent = t("themeCaption");
  refs.heroTitle.textContent = t("heroTitle");
  refs.brandLink.setAttribute("aria-label", t("brandLinkAria"));
  refs.heroText.textContent = t("heroText");
  refs.controlKicker.textContent = t("controlKicker");
  refs.controlTitle.textContent = t("controlTitle");
  refs.controlCopy.innerHTML = t("controlCopy");
  refs.objectSectionTitle.textContent = t("objectSectionTitle");
  refs.objectInputUnit.textContent = t("objectInputUnit");
  refs.objectDistanceLabel.textContent = t("objectDistanceLabel");
  refs.objectHeightLabel.textContent = t("objectHeightLabel");
  refs.elementsSectionTitle.textContent = t("elementsSectionTitle");
  refs.addLensButton.textContent = t("addLens");
  refs.addApertureButton.textContent = t("addAperture");
  refs.resetButton.textContent = t("resetDemo");
  refs.resultsKicker.textContent = t("resultsKicker");
  refs.resultsTitle.textContent = t("resultsTitle");
  refs.resultsCopy.textContent = t("resultsCopy");
  refs.visualKicker.textContent = t("visualKicker");
  refs.visualTitle.textContent = t("visualTitle");
  refs.visualCopy.textContent = t("visualCopy");
  refs.imageDiagramTitle.textContent = t("imageDiagramTitle");
  refs.imageDiagramBadge.textContent = t("imageDiagramBadge");
  refs.imageRaySvg.setAttribute("aria-label", t("imageDiagramAria"));
  refs.downloadImageRayButton.textContent = "PNG";
  refs.downloadImageRayButton.setAttribute("aria-label", `${t("imageDiagramTitle")} PNG`);
  refs.apertureDiagramTitle.textContent = t("apertureDiagramTitle");
  refs.apertureDiagramBadge.textContent = t("apertureDiagramBadge");
  refs.apertureRaySvg.setAttribute("aria-label", t("apertureDiagramAria"));
  refs.downloadApertureRayButton.textContent = "PNG";
  refs.downloadApertureRayButton.setAttribute("aria-label", `${t("apertureDiagramTitle")} PNG`);
  refs.calcKicker.textContent = t("calcKicker");
  refs.calcTitle.textContent = t("calcTitle");
  refs.geometryKicker.textContent = t("geometryKicker");
  refs.geometryTitle.textContent = t("geometryTitle");
  syncObjectInputs();
  applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
}

function getLocale() {
  return I18N.languages[language]?.locale || I18N.languages[I18N.defaultLanguage].locale;
}

function getDefaultLabel(type, index) {
  return `${t(type === "lens" ? "lens" : "aperture")} ${index}`;
}

function isAutoLabel(label, type) {
  const normalizedLabel = String(label || "").trim();
  if (!normalizedLabel) {
    return true;
  }

  for (const languageKey of Object.keys(I18N.languages)) {
    const translatedType = I18N.translations[languageKey][type === "lens" ? "lens" : "aperture"];
    const pattern = new RegExp(`^${translatedType}\\s+\\d+$`, "i");
    if (pattern.test(normalizedLabel)) {
      return true;
    }
  }

  return false;
}

function getElementDisplayLabel(element) {
  if (element.autoLabel || !String(element.label || "").trim()) {
    return getDefaultLabel(element.type, extractIndex(element.id));
  }

  return element.label;
}

function renderControls() {
  refs.elementCount.textContent = t("elementsCount", { count: state.elements.length });
  refs.elementList.innerHTML = state.elements.length
    ? state.elements.map(renderElementCard).join("")
    : `<div class="empty-state">${escapeHtml(t("emptyElements"))}</div>`;
}

function renderElementCard(element, index) {
  const distanceInfo = describePosition(index);
  const title = getElementDisplayLabel(element);
  const badge = t(element.type === "lens" ? "lens" : "aperture");
  const extraFields = element.type === "lens"
    ? `
      <label class="field">
        <span>${escapeHtml(t("opticalPowerDpt"))}</span>
        <input data-id="${element.id}" data-field="power" type="number" step="0.1" value="${escapeHtml(element.power)}">
      </label>
    `
    : "";

  return `
    <article class="element-card">
      <div class="element-head">
        <div class="element-title">
          <span class="type-badge ${element.type}">${badge}</span>
          <div>
            <strong>${escapeHtml(title)}</strong>
            <div class="element-subline">${distanceInfo}</div>
          </div>
        </div>
        <button class="remove-button" type="button" data-remove="${element.id}">${escapeHtml(t("remove"))}</button>
      </div>

      <div class="form-grid">
        <label class="field full-width">
          <span>${escapeHtml(t("label"))}</span>
          <input data-id="${element.id}" data-field="label" type="text" value="${escapeHtml(title)}">
        </label>

        <label class="field">
          <span>${escapeHtml(t("position"))}</span>
          <input data-id="${element.id}" data-field="position" type="number" min="0" step="1" value="${escapeHtml(element.position)}">
        </label>

        <label class="field">
          <span>${element.type === "lens" ? "Freie Öffnung" : "Blendendurchmesser"}</span>
          <input data-id="${element.id}" data-field="diameter" type="number" min="1" step="0.1" value="${escapeHtml(element.diameter)}">
        </label>

        ${extraFields}
      </div>
    </article>
  `;
}

function renderOutputs() {
  const config = sanitizeState(state);
  const result = computeSystem(config);

  refs.heroStats.innerHTML = renderHeroStats(result);
  refs.summaryCards.innerHTML = renderSummaryCards(result);
  refs.calcSteps.innerHTML = renderCalculationBlocks(result);
  refs.distanceSummary.innerHTML = renderDistanceCards(result);
  refs.notes.innerHTML = renderNotes(result);
  refs.imageRaySvg.innerHTML = renderSvg(result, "image");
  refs.apertureRaySvg.innerHTML = renderSvg(result, "aperture");
}

function computeSystem(config) {
  const objectZ = -config.object.distance;
  const elements = [...config.elements].sort(sortByPosition);
  const lenses = elements.filter((element) => element.type === "lens");
  const hasPoweredLens = lenses.some((lens) => Math.abs(lens.power) > EPSILON);

  const matrixSteps = [];
  const enrichedElements = [];
  let currentMatrix = identityMatrix();
  let previousZ = objectZ;

  for (const element of elements) {
    const distance = element.position - previousZ;
    const transfer = translationMatrix(distance);
    const matrixBefore = multiplyMatrices(transfer, currentMatrix);

    matrixSteps.push({
      kind: "space",
      label: `Freiraum bis ${element.label}`,
      distance,
      matrix: transfer,
      cumulative: matrixBefore,
    });

    let matrixAfter = matrixBefore;
    let focalLength = null;

    if (element.type === "lens") {
      focalLength = powerToFocalLength(element.power);
      const matrix = Number.isFinite(focalLength) ? lensMatrix(focalLength) : identityMatrix();
      matrixAfter = multiplyMatrices(matrix, matrixBefore);
      matrixSteps.push({
        kind: "lens",
        label: `${element.label}`,
        power: element.power,
        focalLength,
        matrix,
        cumulative: matrixAfter,
      });
    } else {
      matrixSteps.push({
        kind: "aperture",
        label: `${element.label}`,
        diameter: element.diameter,
        matrix: identityMatrix(),
        cumulative: matrixAfter,
      });
    }

    enrichedElements.push({
      ...element,
      gapFromPrevious: distance,
      matrixBefore,
      matrixAfter,
      focalLength,
      radius: Math.max(0.5, element.diameter / 2),
    });

    currentMatrix = matrixAfter;
    previousZ = element.position;
  }

  const overallMatrix = currentMatrix;
  const [, b] = overallMatrix[0];
  const [, d] = overallMatrix[1];
  const lastPosition = elements.length ? elements[elements.length - 1].position : 0;

  let imageDistance = null;
  let imagePosition = null;
  let imageHeight = null;
  let magnification = null;
  let imageNature = "Keine Abbildung";

  if (hasPoweredLens && Math.abs(d) > EPSILON) {
    imageDistance = -b / d;
    imagePosition = lastPosition + imageDistance;
    magnification = 1 / d;
    imageHeight = magnification * config.object.height;
    imageNature = describeImageCase(imageDistance, magnification);
  } else if (hasPoweredLens) {
    imageNature = "Bild im Unendlichen";
  }

  const imagePlaneMatrix = Number.isFinite(imageDistance)
    ? multiplyMatrices(translationMatrix(imageDistance), overallMatrix)
    : null;

  const apertureStop = findApertureStop(enrichedElements);
  const imageRays = apertureStop
    ? buildImageRays({
        objectY: config.object.height,
        objectZ,
        apertureStop,
        elements: enrichedElements,
        imagePosition,
        lastPosition,
      })
    : [];

  const apertureRays = apertureStop
    ? buildApertureRays({
        objectZ,
        apertureStop,
        elements: enrichedElements,
        imagePosition,
        lastPosition,
      })
    : [];

  const sequentialSteps = buildSequentialLensSteps({
    objectZ,
    objectHeight: config.object.height,
    lenses,
  });

  const distances = buildDistanceSummary({
    objectZ,
    elements,
    imagePosition,
  });

  const notes = [];
  if (!lenses.length) {
    notes.push({
      tone: "warning",
      text: "Mindestens eine Linse ist erforderlich, damit eine Abbildung berechnet werden kann.",
    });
  }
  if (hasPoweredLens && !Number.isFinite(imageDistance)) {
    notes.push({
      tone: "warning",
      text: "Die aktuelle Konfiguration erzeugt ein Bild im Unendlichen. Der Bildabstand ist damit nicht endlich.",
    });
  }
  if (apertureStop) {
    notes.push({
      tone: "success",
      text: `Die aperturbegrenzende Stelle ist aktuell ${apertureStop.label} mit einer wirksamen Halböffnung von ${formatNumber(apertureStop.radius)} mm.`,
    });
  }

  for (const ray of [...imageRays, ...apertureRays]) {
    if (ray.clippedBy) {
      notes.push({
        tone: "warning",
        text: `${ray.label} wird an ${ray.clippedBy} abgeschnitten.`,
      });
    }
  }

  return {
    config,
    objectZ,
    elements,
    enrichedElements,
    lenses,
    hasPoweredLens,
    overallMatrix,
    imagePlaneMatrix,
    imageDistance,
    imagePosition,
    imageHeight,
    magnification,
    imageNature,
    apertureStop,
    imageRays,
    apertureRays,
    sequentialSteps,
    matrixSteps,
    distances,
    notes,
  };
}

function buildSequentialLensSteps({ objectZ, objectHeight, lenses }) {
  const steps = [];
  let currentObjectPosition = objectZ;
  let currentObjectHeight = objectHeight;
  let objectAtInfinity = false;

  for (const lens of lenses) {
    const focalLength = powerToFocalLength(lens.power);

    if (!Number.isFinite(focalLength)) {
      steps.push({
        label: lens.label,
        power: lens.power,
        focalLength: null,
        note: "Brechkraft 0 dpt: Das Element wirkt im paraxialen Modell nicht fokussierend.",
      });
      continue;
    }

    const objectDistance = objectAtInfinity ? Infinity : lens.position - currentObjectPosition;
    let imageDistance = null;
    let imagePosition = null;
    let magnification = null;
    let imageHeight = null;
    let note = "";

    if (!Number.isFinite(objectDistance)) {
      imageDistance = focalLength;
      imagePosition = lens.position + focalLength;
      note = "Einfallende Strahlen sind parallel, daher entsteht das Bild im Brennpunkt der Linse.";
      currentObjectPosition = imagePosition;
      currentObjectHeight = null;
      objectAtInfinity = false;
    } else if (Math.abs((1 / focalLength) - (1 / objectDistance)) < EPSILON) {
      imageDistance = Infinity;
      imagePosition = Infinity;
      note = "Objekt liegt in der Brennebene: Das Zwischenbild liegt im Unendlichen.";
      objectAtInfinity = true;
      currentObjectPosition = Infinity;
      currentObjectHeight = null;
    } else {
      imageDistance = 1 / ((1 / focalLength) - (1 / objectDistance));
      imagePosition = lens.position + imageDistance;
      magnification = -imageDistance / objectDistance;
      imageHeight = currentObjectHeight === null ? null : currentObjectHeight * magnification;
      note = objectDistance > 0
        ? "Positiver Objektabstand: reelles Objekt vor der Linse."
        : "Negativer Objektabstand: virtuelles Objekt rechts der Linse.";
      currentObjectPosition = imagePosition;
      currentObjectHeight = imageHeight;
      objectAtInfinity = false;
    }

    steps.push({
      label: lens.label,
      power: lens.power,
      focalLength,
      objectDistance,
      imageDistance,
      magnification,
      imageHeight,
      imagePosition,
      note,
    });
  }

  return steps;
}

function buildDistanceSummary({ objectZ, elements, imagePosition }) {
  const list = [];

  if (elements.length) {
    list.push({
      title: "Objekt bis erstes Element",
      value: `${formatNumber(elements[0].position - objectZ)} mm`,
    });
  }

  for (let index = 1; index < elements.length; index += 1) {
    list.push({
      title: `${elements[index - 1].label} bis ${elements[index].label}`,
      value: `${formatNumber(elements[index].position - elements[index - 1].position)} mm`,
    });
  }

  if (elements.length && Number.isFinite(imagePosition)) {
    const last = elements[elements.length - 1];
    list.push({
      title: `${last.label} bis Bildebene`,
      value: `${formatNumber(imagePosition - last.position)} mm`,
    });
  }

  if (Number.isFinite(imagePosition)) {
    list.push({
      title: "Absolute Bildposition",
      value: `${formatNumber(imagePosition)} mm`,
    });
  }

  return list;
}

function findApertureStop(elements) {
  const candidates = elements
    .map((element) => {
      const b = element.matrixBefore[0][1];
      const metric = Math.abs(b) > EPSILON ? element.radius / Math.abs(b) : Number.POSITIVE_INFINITY;
      return { ...element, limitingSlope: metric };
    })
    .filter((element) => Number.isFinite(element.limitingSlope))
    .sort((left, right) => left.limitingSlope - right.limitingSlope);

  if (candidates.length) {
    return candidates[0];
  }

  return elements.length
    ? { ...elements.slice().sort((left, right) => left.radius - right.radius)[0], limitingSlope: null }
    : null;
}

function buildImageRays({ objectY, objectZ, apertureStop, elements, imagePosition, lastPosition }) {
  const radius = apertureStop.radius;
  const targets = [
    { label: "Hauptstrahl", targetY: 0, color: "#0d8b8d" },
    { label: "Randstrahl oben", targetY: radius, color: "#d38b2e" },
    { label: "Randstrahl unten", targetY: -radius, color: "#d55d42" },
  ];

  return targets.map((target) => {
    const slope = solveSlopeToPlane({
      objectY,
      targetY: target.targetY,
      plane: apertureStop,
      objectZ,
    });

    return traceRay({
      label: target.label,
      color: target.color,
      objectY,
      initialSlope: slope,
      objectZ,
      elements,
      imagePosition,
      lastPosition,
    });
  });
}

function buildApertureRays({ objectZ, apertureStop, elements, imagePosition, lastPosition }) {
  const radius = apertureStop.radius;
  const targets = [
    { label: "Öffnungsrand oben", targetY: radius, color: "#0d8b8d" },
    { label: "Öffnungsrand unten", targetY: -radius, color: "#d38b2e" },
  ];

  return targets.map((target) => {
    const slope = solveSlopeToPlane({
      objectY: 0,
      targetY: target.targetY,
      plane: apertureStop,
      objectZ,
    });

    return traceRay({
      label: target.label,
      color: target.color,
      objectY: 0,
      initialSlope: slope,
      objectZ,
      elements,
      imagePosition,
      lastPosition,
    });
  });
}

async function downloadSvgAsPng(svgElement, filename) {
  try {
    const serializedSvg = buildExportableSvg(svgElement);
    const viewBox = svgElement.viewBox.baseVal;
    const width = Math.round(viewBox?.width || svgElement.clientWidth || SVG_WIDTH);
    const height = Math.round(viewBox?.height || svgElement.clientHeight || SVG_HEIGHT);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const image = await loadSvgImage(serializedSvg);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      triggerBlobDownload(blob, filename);
    }, "image/png");
  } catch (error) {
    console.error("Diagram export failed", error);
  }
}

function buildExportableSvg(svgElement) {
  const clone = svgElement.cloneNode(true);
  const viewBox = svgElement.viewBox.baseVal;
  const width = Math.round(viewBox?.width || svgElement.clientWidth || SVG_WIDTH);
  const height = Math.round(viewBox?.height || svgElement.clientHeight || SVG_HEIGHT);
  const backgroundFill = document.documentElement.dataset.theme === "dark" ? "#101922" : "#ffffff";

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  inlineSvgStyles(svgElement, clone);

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(height));
  background.setAttribute("fill", backgroundFill);
  clone.insertBefore(background, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

function inlineSvgStyles(sourceNode, targetNode) {
  if (!(sourceNode instanceof Element) || !(targetNode instanceof Element)) {
    return;
  }

  const computed = window.getComputedStyle(sourceNode);
  const properties = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-opacity",
    "stroke-width",
    "stroke-dasharray",
    "stroke-linecap",
    "stroke-linejoin",
    "opacity",
    "font-family",
    "font-size",
    "font-weight",
    "letter-spacing",
    "text-anchor",
    "paint-order",
  ];

  const inlineStyle = properties
    .map((property) => `${property}:${computed.getPropertyValue(property)};`)
    .join("");

  if (inlineStyle) {
    targetNode.setAttribute("style", inlineStyle);
  }

  const sourceChildren = Array.from(sourceNode.children);
  const targetChildren = Array.from(targetNode.children);

  for (let index = 0; index < sourceChildren.length; index += 1) {
    inlineSvgStyles(sourceChildren[index], targetChildren[index]);
  }
}

function loadSvgImage(serializedSvg) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };

    image.src = url;
  });
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderHeroStats(result) {
  const lensCount = result.lenses.length;
  const apertureCount = result.elements.filter((element) => element.type === "aperture").length;
  const stopLabel = result.apertureStop ? result.apertureStop.displayLabel : t("noneShort");

  return [
    statCard(t("heroStatLenses"), `${lensCount}`),
    statCard(t("heroStatManualApertures"), `${apertureCount}`),
    statCard(t("heroStatApertureLimit"), stopLabel),
  ].join("");
}

function renderSummaryCards(result) {
  const imageDistanceText = Number.isFinite(result.imageDistance)
    ? `${formatNumber(result.imageDistance)} mm`
    : result.hasPoweredLens ? t("infinityValue") : t("undefinedValue");
  const imageHeightText = Number.isFinite(result.imageHeight)
    ? `${formatNumber(result.imageHeight)} mm`
    : t("undefinedValue");
  const magnificationText = Number.isFinite(result.magnification)
    ? `${formatNumber(result.magnification)}x`
    : t("undefinedValue");
  const stopText = result.apertureStop
    ? `${result.apertureStop.displayLabel} (${formatNumber(result.apertureStop.diameter)} mm)`
    : t("noLimit");

  return [
    summaryCard(t("summaryImageCaseTitle"), result.imageNature, t("summaryImageCaseCopy")),
    summaryCard(t("summaryImageDistanceTitle"), imageDistanceText, t("summaryImageDistanceCopy")),
    summaryCard(t("summaryImageSizeTitle"), imageHeightText, t("summaryImageSizeCopy")),
    summaryCard(t("summaryMagnificationTitle"), magnificationText, t("summaryMagnificationCopy")),
    summaryCard(t("summaryApertureLimitTitle"), stopText, t("summaryApertureLimitCopy")),
    summaryCard(t("summarySystemMatrixTitle"), formatMatrix(result.overallMatrix), t("summarySystemMatrixCopy")),
  ].join("");
}

function renderCalculationBlocks(result) {
  const matrixLines = [];

  for (const step of result.matrixSteps) {
    if (step.kind === "space") {
      matrixLines.push(t("matrixSpaceLine", {
        label: step.label,
        distance: formatNumber(step.distance),
        matrix: formatMatrix(step.matrix),
      }));
    }
    if (step.kind === "lens") {
      const focalText = Number.isFinite(step.focalLength)
        ? `f = ${formatNumber(step.focalLength)} mm`
        : "f = ∞";
      matrixLines.push(t("matrixLensLine", {
        label: step.label,
        focal: focalText,
        power: formatNumber(step.power),
        matrix: formatMatrix(step.matrix),
      }));
    }
    if (step.kind === "aperture") {
      matrixLines.push(t("matrixApertureLine", {
        label: step.label,
        diameter: formatNumber(step.diameter),
        matrix: formatMatrix(step.matrix),
      }));
    }
  }

  if (Number.isFinite(result.imageDistance) && result.imagePlaneMatrix) {
    matrixLines.push(t("matrixImagePlaneLine", { distance: formatNumber(result.imageDistance) }));
    matrixLines.push(t("matrixImagePlaneMatrixLine", { matrix: formatMatrix(result.imagePlaneMatrix) }));
    matrixLines.push(t("matrixMagnificationLine", { value: formatNumber(result.magnification) }));
    matrixLines.push(t("matrixImageHeightLine", { value: formatNumber(result.imageHeight) }));
  } else if (result.hasPoweredLens) {
    matrixLines.push(t("matrixInfinityLine"));
  }

  const matrixBlock = `
    <section class="calc-block">
      <h3>${escapeHtml(t("calcSystemMatrixTitle"))}</h3>
      <pre class="calc-code">${escapeHtml(matrixLines.join("\n"))}</pre>
    </section>
  `;

  const stepCards = result.sequentialSteps.length
    ? result.sequentialSteps.map((step) => {
        const lines = [];
        if (Number.isFinite(step.focalLength)) {
          lines.push(t("stepFocalLengthLine", {
            power: formatNumber(step.power),
            focal: formatNumber(step.focalLength),
          }));
        }
        if ("objectDistance" in step) {
          lines.push(t("stepObjectDistanceLine", {
            value: Number.isFinite(step.objectDistance) ? `${formatNumber(step.objectDistance)} mm` : "∞",
          }));
        }
        if ("imageDistance" in step) {
          lines.push(t("stepImageDistanceLine", {
            value: Number.isFinite(step.imageDistance) ? `${formatNumber(step.imageDistance)} mm` : "∞",
          }));
        }
        if (Number.isFinite(step.magnification)) {
          lines.push(t("stepMagnificationLine", { value: formatNumber(step.magnification) }));
        }
        if (Number.isFinite(step.imageHeight)) {
          lines.push(t("stepImageHeightLine", { value: formatNumber(step.imageHeight) }));
        }

        return `
          <article class="step-card">
            <strong>${escapeHtml(step.label)}</strong>
            <p>${escapeHtml(lines.join(" · "))}</p>
            <p>${escapeHtml(step.note)}</p>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">${escapeHtml(t("calcNoLensSteps"))}</div>`;

  return `
    ${matrixBlock}
    <section class="calc-block">
      <h3>${escapeHtml(t("calcIntermediateTitle"))}</h3>
      <div class="step-grid">${stepCards}</div>
    </section>
  `;
}

function renderDistanceCards(result) {
  const cards = [];

  if (result.distances.length) {
    cards.push(`
      <section class="distance-card">
        <h3>${escapeHtml(t("distanceSectionTitle"))}</h3>
        <div class="distance-list">
          ${result.distances.map((distance) => `
            <article class="step-card">
              <strong>${escapeHtml(distance.title)}</strong>
              <p>${escapeHtml(distance.value)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `);
  }

  cards.push(`
    <section class="distance-card">
      <h3>${escapeHtml(t("objectDataTitle"))}</h3>
      <p>${escapeHtml(t("objectPositionText", { distance: formatNumber(-result.objectZ) }))}</p>
      <p>${escapeHtml(t("objectHeightText", { height: formatNumber(result.config.object.height) }))}</p>
    </section>
  `);

  return cards.join("");
}

function renderNotes(result) {
  if (!result.notes.length) {
    return `<div class="notice success"><p>${escapeHtml(t("noNotes"))}</p></div>`;
  }

  return result.notes.map((note) => `
    <article class="notice ${note.tone === "success" ? "success" : ""}">
      <p>${escapeHtml(note.text)}</p>
    </article>
  `).join("");
}

function renderSvg(result, mode) {
  const rays = mode === "image" ? result.imageRays : result.apertureRays;
  const objectY = mode === "image" ? result.config.object.height : 0;
  const stop = result.apertureStop;
  const extents = collectExtents(result, rays);
  const geometry = buildGeometry(extents);

  const grid = buildGrid(geometry);
  const axis = `<line class="svg-axis" x1="${PAD_X}" y1="${AXIS_Y}" x2="${SVG_WIDTH - PAD_X}" y2="${AXIS_Y}"></line>`;
  const labels = buildAxisLabels(geometry, result);
  const elements = buildElementGraphics(result.enrichedElements, geometry, stop);
  const objectArrow = buildArrow({
    x: geometry.toX(result.objectZ),
    height: objectY,
    className: "svg-object",
    label: mode === "image" ? t("objectLabel") : t("axisLabel"),
    geometry,
    dashed: false,
  });
  const imageArrow = Number.isFinite(result.imagePosition) && Number.isFinite(result.imageHeight)
    ? buildArrow({
        x: geometry.toX(result.imagePosition),
        height: result.imageHeight,
        className: "svg-image",
        label: t("imageLabel"),
        geometry,
        dashed: result.enrichedElements.length && result.imagePosition < result.enrichedElements[result.enrichedElements.length - 1].position,
      })
    : "";

  const rayMarkup = rays.map((ray) => buildRayMarkup(ray, geometry)).join("");
  const title = mode === "image" ? t("imageRayTitle") : t("apertureRayTitle");

  return `
    <title>${escapeHtml(title)}</title>
    ${grid}
    ${axis}
    ${elements}
    ${objectArrow}
    ${imageArrow}
    ${rayMarkup}
    ${labels}
  `;
}

function buildAxisLabels(geometry, result) {
  const labels = [];
  const total = geometry.zMax - geometry.zMin;
  const step = chooseGridStep(total);

  for (let tick = Math.ceil(geometry.zMin / step) * step; tick <= geometry.zMax; tick += step) {
    const x = geometry.toX(tick);
    labels.push(`<text class="svg-label" x="${x}" y="${SVG_HEIGHT - 12}" text-anchor="middle">${escapeHtml(`${formatNumber(tick, 0)} mm`)}</text>`);
  }

  if (result.apertureStop) {
    labels.push(`
      <text class="svg-label strong" x="${geometry.toX(result.apertureStop.position)}" y="${PAD_Y - 10}" text-anchor="middle">
        ${escapeHtml(t("apertureStopLabel", { label: result.apertureStop.displayLabel }))}
      </text>
    `);
  }

  return labels.join("");
}

function buildElementGraphics(elements, geometry, apertureStop) {
  return elements.map((element) => {
    const x = geometry.toX(element.position);
    const top = geometry.toY(element.radius);
    const bottom = geometry.toY(-element.radius);
    const highlight = apertureStop && apertureStop.id === element.id
      ? `<rect class="svg-stop-highlight" x="${x - 18}" y="${top - 12}" width="36" height="${(bottom - top) + 24}" rx="14"></rect>`
      : "";
    const label = element.displayLabel || getElementDisplayLabel(element);

    if (element.type === "lens") {
      return `
        ${highlight}
        <path d="${buildLensPath(x, top, bottom, element.power >= 0)}" fill="rgba(13, 139, 141, 0.16)" stroke="#0d8b8d" stroke-width="3"></path>
        <text class="svg-label strong" x="${x}" y="${top - 16}" text-anchor="middle">${escapeHtml(label)}</text>
      `;
    }

    const gapTop = geometry.toY(element.radius);
    const gapBottom = geometry.toY(-element.radius);
    return `
      ${highlight}
      <rect x="${x - 6}" y="${PAD_Y}" width="12" height="${gapTop - PAD_Y}" rx="6" fill="#d38b2e"></rect>
      <rect x="${x - 6}" y="${gapBottom}" width="12" height="${SVG_HEIGHT - PAD_Y - gapBottom}" rx="6" fill="#d38b2e"></rect>
      <text class="svg-label strong" x="${x}" y="${gapTop - 16}" text-anchor="middle">${escapeHtml(label)}</text>
    `;
  }).join("");
}

function traceRay({ label, color, objectY, initialSlope, objectZ, elements, imagePosition, lastPosition }) {
  let z = objectZ;
  let y = objectY;
  let slope = initialSlope;
  const points = [{ z, y }];
  let clippedBy = null;

  for (const element of elements) {
    const travel = element.position - z;
    y += slope * travel;
    z = element.position;
    points.push({ z, y });

    if (Math.abs(y) > element.radius + 1e-6) {
      clippedBy = element.displayLabel || getElementDisplayLabel(element);
      break;
    }

    if (element.type === "lens" && Number.isFinite(element.focalLength)) {
      slope -= y / element.focalLength;
    }
  }

  const forwardExtent = Number.isFinite(imagePosition) && imagePosition > z
    ? imagePosition
    : lastPosition + Math.max(120, (lastPosition - objectZ) * 0.22);

  if (!clippedBy && forwardExtent > z) {
    y += slope * (forwardExtent - z);
    z = forwardExtent;
    points.push({ z, y });
  }

  let virtualExtension = null;
  if (!clippedBy && Number.isFinite(imagePosition) && imagePosition < lastPosition) {
    const anchor = points[points.length - 1];
    virtualExtension = [
      anchor,
      {
        z: imagePosition,
        y: anchor.y + ((imagePosition - anchor.z) * slope),
      },
    ];
  }

  return {
    label,
    color,
    points,
    clippedBy,
    virtualExtension,
  };
}

function renderHeroStats(result) {
  const lensCount = result.lenses.length;
  const apertureCount = result.elements.filter((element) => element.type === "aperture").length;
  const stopLabel = result.apertureStop ? result.apertureStop.displayLabel : t("noneShort");

  return [
    statCard(t("heroStatLenses"), `${lensCount}`),
    statCard(t("heroStatManualApertures"), `${apertureCount}`),
    statCard(t("heroStatApertureLimit"), stopLabel),
  ].join("");
}

function renderSummaryCards(result) {
  const imageDistanceText = Number.isFinite(result.imageDistance)
    ? `${formatNumber(result.imageDistance)} mm`
    : result.hasPoweredLens ? t("infinityValue") : t("undefinedValue");
  const imageHeightText = Number.isFinite(result.imageHeight)
    ? `${formatNumber(result.imageHeight)} mm`
    : t("undefinedValue");
  const magnificationText = Number.isFinite(result.magnification)
    ? `${formatNumber(result.magnification)}x`
    : t("undefinedValue");
  const stopText = result.apertureStop
    ? `${result.apertureStop.displayLabel} (${formatNumber(result.apertureStop.diameter)} mm)`
    : t("noLimit");

  return [
    summaryCard(t("summaryImageCaseTitle"), result.imageNature, t("summaryImageCaseCopy")),
    summaryCard(t("summaryImageDistanceTitle"), imageDistanceText, t("summaryImageDistanceCopy")),
    summaryCard(t("summaryImageSizeTitle"), imageHeightText, t("summaryImageSizeCopy")),
    summaryCard(t("summaryMagnificationTitle"), magnificationText, t("summaryMagnificationCopy")),
    summaryCard(t("summaryApertureLimitTitle"), stopText, t("summaryApertureLimitCopy")),
    summaryCard(t("summarySystemMatrixTitle"), formatMatrix(result.overallMatrix), t("summarySystemMatrixCopy")),
  ].join("");
}

function renderCalculationBlocks(result) {
  const matrixLines = [];

  for (const step of result.matrixSteps) {
    if (step.kind === "space") {
      matrixLines.push(t("matrixSpaceLine", {
        label: step.label,
        distance: formatNumber(step.distance),
        matrix: formatMatrix(step.matrix),
      }));
    }
    if (step.kind === "lens") {
      const focalText = Number.isFinite(step.focalLength)
        ? `f = ${formatNumber(step.focalLength)} mm`
        : "f = ∞";
      matrixLines.push(t("matrixLensLine", {
        label: step.label,
        focal: focalText,
        power: formatNumber(step.power),
        matrix: formatMatrix(step.matrix),
      }));
    }
    if (step.kind === "aperture") {
      matrixLines.push(t("matrixApertureLine", {
        label: step.label,
        diameter: formatNumber(step.diameter),
        matrix: formatMatrix(step.matrix),
      }));
    }
  }

  if (Number.isFinite(result.imageDistance) && result.imagePlaneMatrix) {
    matrixLines.push(t("matrixImagePlaneLine", { distance: formatNumber(result.imageDistance) }));
    matrixLines.push(t("matrixImagePlaneMatrixLine", { matrix: formatMatrix(result.imagePlaneMatrix) }));
    matrixLines.push(t("matrixMagnificationLine", { value: formatNumber(result.magnification) }));
    matrixLines.push(t("matrixImageHeightLine", { value: formatNumber(result.imageHeight) }));
  } else if (result.hasPoweredLens) {
    matrixLines.push(t("matrixInfinityLine"));
  }

  const matrixBlock = `
    <section class="calc-block">
      <h3>${escapeHtml(t("calcSystemMatrixTitle"))}</h3>
      <pre class="calc-code">${escapeHtml(matrixLines.join("\n"))}</pre>
    </section>
  `;

  const stepCards = result.sequentialSteps.length
    ? result.sequentialSteps.map((step) => {
        const lines = [];
        if (Number.isFinite(step.focalLength)) {
          lines.push(t("stepFocalLengthLine", {
            power: formatNumber(step.power),
            focal: formatNumber(step.focalLength),
          }));
        }
        if ("objectDistance" in step) {
          lines.push(t("stepObjectDistanceLine", {
            value: Number.isFinite(step.objectDistance) ? `${formatNumber(step.objectDistance)} mm` : "∞",
          }));
        }
        if ("imageDistance" in step) {
          lines.push(t("stepImageDistanceLine", {
            value: Number.isFinite(step.imageDistance) ? `${formatNumber(step.imageDistance)} mm` : "∞",
          }));
        }
        if (Number.isFinite(step.magnification)) {
          lines.push(t("stepMagnificationLine", { value: formatNumber(step.magnification) }));
        }
        if (Number.isFinite(step.imageHeight)) {
          lines.push(t("stepImageHeightLine", { value: formatNumber(step.imageHeight) }));
        }

        return `
          <article class="step-card">
            <strong>${escapeHtml(step.label)}</strong>
            <p>${escapeHtml(lines.join(" · "))}</p>
            <p>${escapeHtml(step.note)}</p>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">${escapeHtml(t("calcNoLensSteps"))}</div>`;

  return `
    ${matrixBlock}
    <section class="calc-block">
      <h3>${escapeHtml(t("calcIntermediateTitle"))}</h3>
      <div class="step-grid">${stepCards}</div>
    </section>
  `;
}

function renderDistanceCards(result) {
  const cards = [];

  if (result.distances.length) {
    cards.push(`
      <section class="distance-card">
        <h3>${escapeHtml(t("distanceSectionTitle"))}</h3>
        <div class="distance-list">
          ${result.distances.map((distance) => `
            <article class="step-card">
              <strong>${escapeHtml(distance.title)}</strong>
              <p>${escapeHtml(distance.value)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `);
  }

  cards.push(`
    <section class="distance-card">
      <h3>${escapeHtml(t("objectDataTitle"))}</h3>
      <p>${escapeHtml(t("objectPositionText", { distance: formatNumber(-result.objectZ) }))}</p>
      <p>${escapeHtml(t("objectHeightText", { height: formatNumber(result.config.object.height) }))}</p>
    </section>
  `);

  return cards.join("");
}

function renderNotes(result) {
  if (!result.notes.length) {
    return `<div class="notice success"><p>${escapeHtml(t("noNotes"))}</p></div>`;
  }

  return result.notes.map((note) => `
    <article class="notice ${note.tone === "success" ? "success" : ""}">
      <p>${escapeHtml(note.text)}</p>
    </article>
  `).join("");
}

function renderSvg(result, mode) {
  const rays = mode === "image" ? result.imageRays : result.apertureRays;
  const objectY = mode === "image" ? result.config.object.height : 0;
  const stop = result.apertureStop;
  const extents = collectExtents(result, rays);
  const geometry = buildGeometry(extents);

  const grid = buildGrid(geometry);
  const axis = `<line class="svg-axis" x1="${PAD_X}" y1="${AXIS_Y}" x2="${SVG_WIDTH - PAD_X}" y2="${AXIS_Y}"></line>`;
  const labels = buildAxisLabels(geometry, result);
  const elements = buildElementGraphics(result.enrichedElements, geometry, stop);
  const objectArrow = buildArrow({
    x: geometry.toX(result.objectZ),
    height: objectY,
    className: "svg-object",
    label: mode === "image" ? t("objectLabel") : t("axisLabel"),
    geometry,
    dashed: false,
  });
  const imageArrow = Number.isFinite(result.imagePosition) && Number.isFinite(result.imageHeight)
    ? buildArrow({
        x: geometry.toX(result.imagePosition),
        height: result.imageHeight,
        className: "svg-image",
        label: t("imageLabel"),
        geometry,
        dashed: result.enrichedElements.length && result.imagePosition < result.enrichedElements[result.enrichedElements.length - 1].position,
      })
    : "";

  const rayMarkup = rays.map((ray) => buildRayMarkup(ray, geometry)).join("");
  const title = mode === "image" ? t("imageRayTitle") : t("apertureRayTitle");

  return `
    <title>${escapeHtml(title)}</title>
    ${grid}
    ${axis}
    ${elements}
    ${objectArrow}
    ${imageArrow}
    ${rayMarkup}
    ${labels}
  `;
}

function buildAxisLabels(geometry, result) {
  const labels = [];
  const total = geometry.zMax - geometry.zMin;
  const step = chooseGridStep(total);

  for (let tick = Math.ceil(geometry.zMin / step) * step; tick <= geometry.zMax; tick += step) {
    const x = geometry.toX(tick);
    labels.push(`<text class="svg-label" x="${x}" y="${SVG_HEIGHT - 12}" text-anchor="middle">${escapeHtml(`${formatNumber(tick, 0)} mm`)}</text>`);
  }

  if (result.apertureStop) {
    labels.push(`
      <text class="svg-label strong" x="${geometry.toX(result.apertureStop.position)}" y="${PAD_Y - 10}" text-anchor="middle">
        ${escapeHtml(t("apertureStopLabel", { label: result.apertureStop.displayLabel }))}
      </text>
    `);
  }

  return labels.join("");
}

function buildElementGraphics(elements, geometry, apertureStop) {
  return elements.map((element) => {
    const x = geometry.toX(element.position);
    const top = geometry.toY(element.radius);
    const bottom = geometry.toY(-element.radius);
    const highlight = apertureStop && apertureStop.id === element.id
      ? `<rect class="svg-stop-highlight" x="${x - 18}" y="${top - 12}" width="36" height="${(bottom - top) + 24}" rx="14"></rect>`
      : "";
    const label = element.displayLabel || getElementDisplayLabel(element);

    if (element.type === "lens") {
      return `
        ${highlight}
        <path d="${buildLensPath(x, top, bottom, element.power >= 0)}" fill="rgba(13, 139, 141, 0.16)" stroke="#0d8b8d" stroke-width="3"></path>
        <text class="svg-label strong" x="${x}" y="${top - 16}" text-anchor="middle">${escapeHtml(label)}</text>
      `;
    }

    const gapTop = geometry.toY(element.radius);
    const gapBottom = geometry.toY(-element.radius);
    return `
      ${highlight}
      <rect x="${x - 6}" y="${PAD_Y}" width="12" height="${gapTop - PAD_Y}" rx="6" fill="#d38b2e"></rect>
      <rect x="${x - 6}" y="${gapBottom}" width="12" height="${SVG_HEIGHT - PAD_Y - gapBottom}" rx="6" fill="#d38b2e"></rect>
      <text class="svg-label strong" x="${x}" y="${gapTop - 16}" text-anchor="middle">${escapeHtml(label)}</text>
    `;
  }).join("");
}

function traceRay({ label, color, objectY, initialSlope, objectZ, elements, imagePosition, lastPosition }) {
  let z = objectZ;
  let y = objectY;
  let slope = initialSlope;
  const points = [{ z, y }];
  let clippedBy = null;

  for (const element of elements) {
    const travel = element.position - z;
    y += slope * travel;
    z = element.position;
    points.push({ z, y });

    if (Math.abs(y) > element.radius + 1e-6) {
      clippedBy = element.displayLabel || getElementDisplayLabel(element);
      break;
    }

    if (element.type === "lens" && Number.isFinite(element.focalLength)) {
      slope -= y / element.focalLength;
    }
  }

  const forwardExtent = Number.isFinite(imagePosition) && imagePosition > z
    ? imagePosition
    : lastPosition + Math.max(120, (lastPosition - objectZ) * 0.22);

  if (!clippedBy && forwardExtent > z) {
    y += slope * (forwardExtent - z);
    z = forwardExtent;
    points.push({ z, y });
  }

  let virtualExtension = null;
  if (!clippedBy && Number.isFinite(imagePosition) && imagePosition < lastPosition) {
    const anchor = points[points.length - 1];
    virtualExtension = [
      anchor,
      {
        z: imagePosition,
        y: anchor.y + ((imagePosition - anchor.z) * slope),
      },
    ];
  }

  return {
    label,
    color,
    points,
    clippedBy,
    virtualExtension,
  };
}

function solveSlopeToPlane({ objectY, targetY, plane, objectZ }) {
  const a = plane.matrixBefore[0][0];
  const b = plane.matrixBefore[0][1];
  if (Math.abs(b) > EPSILON) {
    return (targetY - (a * objectY)) / b;
  }

  const distance = plane.position - objectZ;
  return Math.abs(distance) > EPSILON ? (targetY - objectY) / distance : 0;
}

function traceRay({ label, color, objectY, initialSlope, objectZ, elements, imagePosition, lastPosition }) {
  let z = objectZ;
  let y = objectY;
  let slope = initialSlope;
  const points = [{ z, y }];
  let clippedBy = null;

  for (const element of elements) {
    const travel = element.position - z;
    y += slope * travel;
    z = element.position;
    points.push({ z, y });

    if (Math.abs(y) > element.radius + 1e-6) {
      clippedBy = element.label;
      break;
    }

    if (element.type === "lens" && Number.isFinite(element.focalLength)) {
      slope -= y / element.focalLength;
    }
  }

  const forwardExtent = Number.isFinite(imagePosition) && imagePosition > z
    ? imagePosition
    : lastPosition + Math.max(120, (lastPosition - objectZ) * 0.22);

  if (!clippedBy && forwardExtent > z) {
    y += slope * (forwardExtent - z);
    z = forwardExtent;
    points.push({ z, y });
  }

  let virtualExtension = null;
  if (!clippedBy && Number.isFinite(imagePosition) && imagePosition < lastPosition) {
    const anchor = points[points.length - 1];
    virtualExtension = [
      anchor,
      {
        z: imagePosition,
        y: anchor.y + ((imagePosition - anchor.z) * slope),
      },
    ];
  }

  return {
    label,
    color,
    points,
    clippedBy,
    virtualExtension,
  };
}

function renderHeroStats(result) {
  const lensCount = result.lenses.length;
  const apertureCount = result.elements.filter((element) => element.type === "aperture").length;
  const stopLabel = result.apertureStop ? result.apertureStop.label : "keine";

  return [
    statCard("Linsen", `${lensCount}`),
    statCard("Manuelle Blenden", `${apertureCount}`),
    statCard("Aperturbegrenzung", stopLabel),
  ].join("");
}

function statCard(label, value) {
  return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function renderSummaryCards(result) {
  const imageDistanceText = Number.isFinite(result.imageDistance)
    ? `${formatNumber(result.imageDistance)} mm`
    : result.hasPoweredLens ? "Unendlich" : "Nicht definiert";
  const imageHeightText = Number.isFinite(result.imageHeight)
    ? `${formatNumber(result.imageHeight)} mm`
    : "Nicht definiert";
  const magnificationText = Number.isFinite(result.magnification)
    ? `${formatNumber(result.magnification)}x`
    : "Nicht definiert";
  const stopText = result.apertureStop
    ? `${result.apertureStop.label} (${formatNumber(result.apertureStop.diameter)} mm)`
    : "Keine Begrenzung";

  return [
    summaryCard(
      "Abbildungsfall",
      result.imageNature,
      "Kombination aus Real-/Virtualbild, Orientierung und Größenänderung."
    ),
    summaryCard(
      "Bildabstand",
      imageDistanceText,
      "Gemessen ab dem letzten optischen Element entlang der Achse."
    ),
    summaryCard(
      "Bildgröße",
      imageHeightText,
      "Vorzeichenbehaftet: negatives Vorzeichen bedeutet umgekehrtes Bild."
    ),
    summaryCard(
      "Abbildungsmaßstab",
      magnificationText,
      "Ermittelt aus der Systemmatrix in der Bildebene."
    ),
    summaryCard(
      "Aperturbegrenzung",
      stopText,
      "Kleinster wirksamer Öffnungswinkel für den achsnahen Strahlkegel."
    ),
    summaryCard(
      "Systemmatrix",
      formatMatrix(result.overallMatrix),
      "ABCD-Matrix direkt hinter dem letzten Element."
    ),
  ].join("");
}

function summaryCard(label, value, copy) {
  return `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(copy)}</p>
    </article>
  `;
}

function renderCalculationBlocks(result) {
  const matrixLines = [];

  for (const step of result.matrixSteps) {
    if (step.kind === "space") {
      matrixLines.push(`${step.label}: T(${formatNumber(step.distance)} mm) = ${formatMatrix(step.matrix)}`);
    }
    if (step.kind === "lens") {
      const focalText = Number.isFinite(step.focalLength)
        ? `f = ${formatNumber(step.focalLength)} mm`
        : "f = ∞";
      matrixLines.push(`${step.label}: L(${focalText}, ${formatNumber(step.power)} dpt) = ${formatMatrix(step.matrix)}`);
    }
    if (step.kind === "aperture") {
      matrixLines.push(`${step.label}: Blende ${formatNumber(step.diameter)} mm, Matrix = ${formatMatrix(step.matrix)}`);
    }
  }

  if (Number.isFinite(result.imageDistance) && result.imagePlaneMatrix) {
    matrixLines.push(`Bildebene: q = -B / D = ${formatNumber(result.imageDistance)} mm`);
    matrixLines.push(`M_bild = T(q) * M = ${formatMatrix(result.imagePlaneMatrix)}`);
    matrixLines.push(`Abbildungsmaßstab β = 1 / D = ${formatNumber(result.magnification)}`);
    matrixLines.push(`Bildhöhe h' = β * G = ${formatNumber(result.imageHeight)} mm`);
  } else if (result.hasPoweredLens) {
    matrixLines.push("Bildebene: D ≈ 0, daher liegt das Bild im Unendlichen.");
  }

  const matrixBlock = `
    <section class="calc-block">
      <h3>Systemmatrix</h3>
      <pre class="calc-code">${escapeHtml(matrixLines.join("\n"))}</pre>
    </section>
  `;

  const stepCards = result.sequentialSteps.length
    ? result.sequentialSteps.map((step) => {
        const lines = [];
        if (Number.isFinite(step.focalLength)) {
          lines.push(`f = 1000 / ${formatNumber(step.power)} = ${formatNumber(step.focalLength)} mm`);
        }
        if ("objectDistance" in step) {
          lines.push(`g = ${Number.isFinite(step.objectDistance) ? `${formatNumber(step.objectDistance)} mm` : "∞"}`);
        }
        if ("imageDistance" in step) {
          lines.push(`b = ${Number.isFinite(step.imageDistance) ? `${formatNumber(step.imageDistance)} mm` : "∞"}`);
        }
        if (Number.isFinite(step.magnification)) {
          lines.push(`β = -b / g = ${formatNumber(step.magnification)}`);
        }
        if (Number.isFinite(step.imageHeight)) {
          lines.push(`B = β * G = ${formatNumber(step.imageHeight)} mm`);
        }

        return `
          <article class="step-card">
            <strong>${escapeHtml(step.label)}</strong>
            <p>${escapeHtml(lines.join(" · "))}</p>
            <p>${escapeHtml(step.note)}</p>
          </article>
        `;
      }).join("")
    : '<div class="empty-state">Noch keine linsenweisen Schritte vorhanden.</div>';

  return `
    ${matrixBlock}
    <section class="calc-block">
      <h3>Linsenweise Zwischenbilder</h3>
      <div class="step-grid">${stepCards}</div>
    </section>
  `;
}

function renderDistanceCards(result) {
  const cards = [];

  if (result.distances.length) {
    cards.push(`
      <section class="distance-card">
        <h3>Axiale Abstände</h3>
        <div class="distance-list">
          ${result.distances.map((distance) => `
            <article class="step-card">
              <strong>${escapeHtml(distance.title)}</strong>
              <p>${escapeHtml(distance.value)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `);
  }

  cards.push(`
    <section class="distance-card">
      <h3>Objektdaten</h3>
      <p>Objektlage: ${formatNumber(-result.objectZ)} mm vor dem Systemnullpunkt.</p>
      <p>Objektgröße: ${formatNumber(result.config.object.height)} mm.</p>
    </section>
  `);

  return cards.join("");
}

function renderNotes(result) {
  if (!result.notes.length) {
    return '<div class="notice success"><p>Aktuell liegen keine besonderen Hinweise vor.</p></div>';
  }

  return result.notes.map((note) => `
    <article class="notice ${note.tone === "success" ? "success" : ""}">
      <p>${escapeHtml(note.text)}</p>
    </article>
  `).join("");
}

function renderSvg(result, mode) {
  const rays = mode === "image" ? result.imageRays : result.apertureRays;
  const objectY = mode === "image" ? result.config.object.height : 0;
  const stop = result.apertureStop;
  const extents = collectExtents(result, rays);
  const geometry = buildGeometry(extents);

  const grid = buildGrid(geometry);
  const axis = `<line class="svg-axis" x1="${PAD_X}" y1="${AXIS_Y}" x2="${SVG_WIDTH - PAD_X}" y2="${AXIS_Y}"></line>`;
  const labels = buildAxisLabels(geometry, result);
  const elements = buildElementGraphics(result.enrichedElements, geometry, stop);
  const objectArrow = buildArrow({
    x: geometry.toX(result.objectZ),
    height: objectY,
    className: "svg-object",
    label: mode === "image" ? "Objekt" : "Achse",
    geometry,
    dashed: false,
  });
  const imageArrow = Number.isFinite(result.imagePosition) && Number.isFinite(result.imageHeight)
    ? buildArrow({
        x: geometry.toX(result.imagePosition),
        height: result.imageHeight,
        className: "svg-image",
        label: "Bild",
        geometry,
        dashed: result.enrichedElements.length && result.imagePosition < result.enrichedElements[result.enrichedElements.length - 1].position,
      })
    : "";

  const rayMarkup = rays.map((ray) => buildRayMarkup(ray, geometry)).join("");
  const title = mode === "image" ? "Bildstrahlengang" : "Öffnungsstrahlengang";

  return `
    <title>${title}</title>
    ${grid}
    ${axis}
    ${elements}
    ${objectArrow}
    ${imageArrow}
    ${rayMarkup}
    ${labels}
  `;
}

function collectExtents(result, rays) {
  const zValues = [result.objectZ, 0];
  const yValues = [result.config.object.height, 0];

  for (const element of result.enrichedElements) {
    zValues.push(element.position);
    yValues.push(element.radius, -element.radius);
  }

  if (Number.isFinite(result.imagePosition)) {
    zValues.push(result.imagePosition);
  }

  if (Number.isFinite(result.imageHeight)) {
    yValues.push(result.imageHeight);
  }

  for (const ray of rays) {
    for (const point of ray.points) {
      zValues.push(point.z);
      yValues.push(point.y);
    }
    if (ray.virtualExtension) {
      for (const point of ray.virtualExtension) {
        zValues.push(point.z);
        yValues.push(point.y);
      }
    }
  }

  const zMin = Math.min(...zValues) - 40;
  const zMax = Math.max(...zValues) + 40;
  const yMax = Math.max(24, ...yValues.map((value) => Math.abs(value))) * 1.2;

  return { zMin, zMax, yMax };
}

function buildGeometry({ zMin, zMax, yMax }) {
  const width = SVG_WIDTH - (2 * PAD_X);
  const height = SVG_HEIGHT - (2 * PAD_Y);

  return {
    zMin,
    zMax,
    yMax,
    toX(value) {
      if (Math.abs(zMax - zMin) < EPSILON) {
        return PAD_X + (width / 2);
      }
      return PAD_X + (((value - zMin) / (zMax - zMin)) * width);
    },
    toY(value) {
      if (Math.abs(yMax) < EPSILON) {
        return AXIS_Y;
      }
      return AXIS_Y - ((value / yMax) * (height / 2));
    },
  };
}

function buildGrid(geometry) {
  const lines = [];
  const total = geometry.zMax - geometry.zMin;
  const step = chooseGridStep(total);

  for (let tick = Math.ceil(geometry.zMin / step) * step; tick <= geometry.zMax; tick += step) {
    const x = geometry.toX(tick);
    lines.push(`<line class="svg-grid" x1="${x}" y1="${PAD_Y}" x2="${x}" y2="${SVG_HEIGHT - PAD_Y}"></line>`);
  }

  return lines.join("");
}

function buildAxisLabels(geometry, result) {
  const labels = [];
  const total = geometry.zMax - geometry.zMin;
  const step = chooseGridStep(total);

  for (let tick = Math.ceil(geometry.zMin / step) * step; tick <= geometry.zMax; tick += step) {
    const x = geometry.toX(tick);
    labels.push(`<text class="svg-label" x="${x}" y="${SVG_HEIGHT - 12}" text-anchor="middle">${escapeHtml(`${formatNumber(tick, 0)} mm`)}</text>`);
  }

  if (result.apertureStop) {
    labels.push(`
      <text class="svg-label strong" x="${geometry.toX(result.apertureStop.position)}" y="${PAD_Y - 10}" text-anchor="middle">
        ${escapeHtml(`Aperturbegrenzung: ${result.apertureStop.label}`)}
      </text>
    `);
  }

  return labels.join("");
}

function buildElementGraphics(elements, geometry, apertureStop) {
  return elements.map((element) => {
    const x = geometry.toX(element.position);
    const top = geometry.toY(element.radius);
    const bottom = geometry.toY(-element.radius);
    const highlight = apertureStop && apertureStop.id === element.id
      ? `<rect class="svg-stop-highlight" x="${x - 18}" y="${top - 12}" width="36" height="${(bottom - top) + 24}" rx="14"></rect>`
      : "";

    if (element.type === "lens") {
      return `
        ${highlight}
        <path d="${buildLensPath(x, top, bottom, element.power >= 0)}" fill="rgba(13, 139, 141, 0.16)" stroke="#0d8b8d" stroke-width="3"></path>
        <text class="svg-label strong" x="${x}" y="${top - 16}" text-anchor="middle">${escapeHtml(element.label)}</text>
      `;
    }

    const gapTop = geometry.toY(element.radius);
    const gapBottom = geometry.toY(-element.radius);
    return `
      ${highlight}
      <rect x="${x - 6}" y="${PAD_Y}" width="12" height="${gapTop - PAD_Y}" rx="6" fill="#d38b2e"></rect>
      <rect x="${x - 6}" y="${gapBottom}" width="12" height="${SVG_HEIGHT - PAD_Y - gapBottom}" rx="6" fill="#d38b2e"></rect>
      <text class="svg-label strong" x="${x}" y="${gapTop - 16}" text-anchor="middle">${escapeHtml(element.label)}</text>
    `;
  }).join("");
}

function buildLensPath(x, top, bottom, positive) {
  const mid = (top + bottom) / 2;
  const spread = positive ? 22 : 11;
  const pinch = positive ? 11 : 23;

  return [
    `M ${x - pinch} ${top}`,
    `Q ${x - spread} ${mid} ${x - pinch} ${bottom}`,
    `L ${x + pinch} ${bottom}`,
    `Q ${x + spread} ${mid} ${x + pinch} ${top}`,
    "Z",
  ].join(" ");
}

function buildArrow({ x, height, className, label, geometry, dashed }) {
  const yTip = geometry.toY(height);
  const yBase = geometry.toY(0);
  const direction = height >= 0 ? -1 : 1;
  const arrowSize = 12;
  const dashAttr = dashed ? ' stroke-dasharray="12 10"' : "";

  return `
    <g>
      <line class="${className}" x1="${x}" y1="${yBase}" x2="${x}" y2="${yTip}"${dashAttr}></line>
      <path class="${className}" d="M ${x - arrowSize} ${yTip + (direction * arrowSize)} L ${x} ${yTip} L ${x + arrowSize} ${yTip + (direction * arrowSize)}"${dashAttr}></path>
      <text class="svg-label strong" x="${x}" y="${height >= 0 ? yTip - 16 : yTip + 30}" text-anchor="middle">${escapeHtml(label)}</text>
    </g>
  `;
}

function buildRayMarkup(ray, geometry) {
  const pathData = pointsToPath(ray.points, geometry);
  const extension = ray.virtualExtension
    ? `<path class="svg-ray dashed" d="${pointsToPath(ray.virtualExtension, geometry)}" stroke="${ray.color}"></path>`
    : "";

  return `
    <path class="svg-ray" d="${pathData}" stroke="${ray.color}"></path>
    ${extension}
  `;
}

function pointsToPath(points, geometry) {
  return points.map((point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command} ${geometry.toX(point.z)} ${geometry.toY(point.y)}`;
  }).join(" ");
}

function describeImageCase(imageDistance, magnification) {
  if (!Number.isFinite(imageDistance) || !Number.isFinite(magnification)) {
    return "Bild im Unendlichen";
  }

  const reality = imageDistance > 0 ? "Reelles" : "Virtuelles";
  const orientation = magnification < 0 ? "umgekehrtes" : "aufrechtes";
  const scale = Math.abs(magnification) > 1.05
    ? "vergrößertes"
    : Math.abs(magnification) < 0.95
      ? "verkleinertes"
      : "nahezu gleich großes";

  return `${reality}, ${orientation}, ${scale} Bild`;
}

function describePosition(index) {
  if (index === 0) {
    return "erstes Element im aktuellen Aufbau";
  }

  const previous = state.elements[index - 1];
  const current = state.elements[index];
  const distance = current.position - previous.position;
  return `${formatNumber(distance)} mm nach ${previous.label || `Element ${index}`}`;
}

function syncObjectInputs() {
  refs.objectDistance.value = state.object.distance;
  refs.objectHeight.value = state.object.height;
}

function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";

  if (normalizedTheme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  refs.themeToggleButton.setAttribute("aria-pressed", String(normalizedTheme === "dark"));
  refs.themeToggleLabel.textContent = normalizedTheme === "dark" ? "Dunkel" : "Hell";
}

function sanitizeState(inputState) {
  const objectDistance = clamp(toNumber(inputState.object.distance, 320), 1, 100000);
  const objectHeight = toNumber(inputState.object.height, 28);
  const elements = inputState.elements
    .map((element, index) => sanitizeElement(element, index))
    .sort(sortByPosition);

  return {
    object: {
      distance: objectDistance,
      height: objectHeight,
    },
    elements,
  };
}

function sanitizeElement(element, index) {
  const base = {
    id: element.id || `${element.type || "element"}-${index + 1}`,
    type: element.type === "aperture" ? "aperture" : "lens",
    label: element.label || (element.type === "aperture" ? `Blende ${index + 1}` : `Linse ${index + 1}`),
    position: clamp(toNumber(element.position, 80 + (index * 90)), 0, 100000),
    diameter: clamp(toNumber(element.diameter, 32), 1, 100000),
  };

  if (base.type === "lens") {
    return {
      ...base,
      power: toNumber(element.power, 4),
    };
  }

  return base;
}

function createLens() {
  counters.lens += 1;
  const basePosition = state.elements.length
    ? Math.max(...state.elements.map((element) => element.position)) + 120
    : 120;

  return {
    id: `lens-${counters.lens}`,
    type: "lens",
    label: `Linse ${counters.lens}`,
    position: basePosition,
    power: 4,
    diameter: 40,
  };
}

function createAperture() {
  counters.aperture += 1;
  const basePosition = state.elements.length
    ? Math.max(...state.elements.map((element) => element.position)) + 80
    : 180;

  return {
    id: `aperture-${counters.aperture}`,
    type: "aperture",
    label: `Blende ${counters.aperture}`,
    position: basePosition,
    diameter: 24,
  };
}

function buildCounters(elements) {
  return elements.reduce((accumulator, element) => {
    if (element.type === "lens") {
      accumulator.lens = Math.max(accumulator.lens, extractIndex(element.id));
    }
    if (element.type === "aperture") {
      accumulator.aperture = Math.max(accumulator.aperture, extractIndex(element.id));
    }
    return accumulator;
  }, { lens: 0, aperture: 0 });
}

function extractIndex(id) {
  const match = String(id).match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function sortElementsInState() {
  state.elements.sort(sortByPosition);
}

function sortByPosition(left, right) {
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  return left.label.localeCompare(right.label, "de");
}

function powerToFocalLength(power) {
  if (Math.abs(power) < EPSILON) {
    return Number.POSITIVE_INFINITY;
  }
  return 1000 / power;
}

function identityMatrix() {
  return [
    [1, 0],
    [0, 1],
  ];
}

function translationMatrix(distance) {
  return [
    [1, distance],
    [0, 1],
  ];
}

function lensMatrix(focalLength) {
  return [
    [1, 0],
    [-(1 / focalLength), 1],
  ];
}

function multiplyMatrices(left, right) {
  return [
    [
      (left[0][0] * right[0][0]) + (left[0][1] * right[1][0]),
      (left[0][0] * right[0][1]) + (left[0][1] * right[1][1]),
    ],
    [
      (left[1][0] * right[0][0]) + (left[1][1] * right[1][0]),
      (left[1][0] * right[0][1]) + (left[1][1] * right[1][1]),
    ],
  ];
}

function formatMatrix(matrix) {
  return `[[${formatNumber(matrix[0][0])}, ${formatNumber(matrix[0][1])}], [${formatNumber(matrix[1][0], 4)}, ${formatNumber(matrix[1][1])}]]`;
}

function chooseGridStep(totalWidth) {
  if (totalWidth <= 250) {
    return 25;
  }
  if (totalWidth <= 500) {
    return 50;
  }
  if (totalWidth <= 1200) {
    return 100;
  }
  if (totalWidth <= 2500) {
    return 200;
  }
  return 500;
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }
    const parsed = JSON.parse(raw);
    return {
      object: {
        distance: toNumber(parsed.object?.distance, defaultState.object.distance),
        height: toNumber(parsed.object?.height, defaultState.object.height),
      },
      elements: Array.isArray(parsed.elements) ? parsed.elements : clone(defaultState.elements),
    };
  } catch (error) {
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch (error) {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    /* no-op */
  }
}

function loadLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch (error) {
    return I18N.defaultLanguage;
  }
}

function saveLanguage(nextLanguage) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(nextLanguage));
  } catch (error) {
    /* no-op */
  }
}

function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";

  if (normalizedTheme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  refs.themeToggleButton.setAttribute("aria-pressed", String(normalizedTheme === "dark"));
  refs.themeToggleLabel.textContent = normalizedTheme === "dark" ? t("themeDark") : t("themeLight");
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function sanitizeElement(element, index) {
  const type = element.type === "aperture" ? "aperture" : "lens";
  const inferredAutoLabel = element.autoLabel !== undefined ? element.autoLabel : isAutoLabel(element.label, type);
  const base = {
    id: element.id || `${type}-${index + 1}`,
    type,
    label: typeof element.label === "string" ? element.label : "",
    autoLabel: inferredAutoLabel,
    position: clamp(toNumber(element.position, 80 + (index * 90)), 0, 100000),
    diameter: clamp(toNumber(element.diameter, 32), 1, 100000),
  };

  if (base.type === "lens") {
    return {
      ...base,
      power: toNumber(element.power, 4),
    };
  }

  return base;
}

function createLens() {
  counters.lens += 1;
  const basePosition = state.elements.length
    ? Math.max(...state.elements.map((element) => element.position)) + 120
    : 120;

  return {
    id: `lens-${counters.lens}`,
    type: "lens",
    label: "",
    autoLabel: true,
    position: basePosition,
    power: 4,
    diameter: 40,
  };
}

function createAperture() {
  counters.aperture += 1;
  const basePosition = state.elements.length
    ? Math.max(...state.elements.map((element) => element.position)) + 80
    : 180;

  return {
    id: `aperture-${counters.aperture}`,
    type: "aperture",
    label: "",
    autoLabel: true,
    position: basePosition,
    diameter: 24,
  };
}

function sortByPosition(left, right) {
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  return getElementDisplayLabel(left).localeCompare(getElementDisplayLabel(right), getLocale());
}

function renderControls() {
  refs.elementCount.textContent = t("elementsCount", { count: state.elements.length });
  refs.elementList.innerHTML = state.elements.length
    ? state.elements.map(renderElementCard).join("")
    : `<div class="empty-state">${escapeHtml(t("emptyElements"))}</div>`;
}

function renderElementCard(element, index) {
  const distanceInfo = describePosition(index);
  const title = getElementDisplayLabel(element);
  const badge = t(element.type === "lens" ? "lens" : "aperture");
  const extraFields = element.type === "lens"
    ? `
      <label class="field">
        <span>${escapeHtml(t("opticalPowerDpt"))}</span>
        <input data-id="${element.id}" data-field="power" type="number" step="0.1" value="${escapeHtml(element.power)}">
      </label>
    `
    : "";

  return `
    <article class="element-card">
      <div class="element-head">
        <div class="element-title">
          <span class="type-badge ${element.type}">${escapeHtml(badge)}</span>
          <div>
            <strong>${escapeHtml(title)}</strong>
            <div class="element-subline">${escapeHtml(distanceInfo)}</div>
          </div>
        </div>
        <button class="remove-button" type="button" data-remove="${element.id}">${escapeHtml(t("remove"))}</button>
      </div>

      <div class="form-grid">
        <label class="field full-width">
          <span>${escapeHtml(t("label"))}</span>
          <input data-id="${element.id}" data-field="label" type="text" value="${escapeHtml(element.autoLabel ? "" : title)}">
        </label>

        <label class="field">
          <span>${escapeHtml(t("position"))}</span>
          <input data-id="${element.id}" data-field="position" type="number" min="0" step="1" value="${escapeHtml(element.position)}">
        </label>

        <label class="field">
          <span>${escapeHtml(t(element.type === "lens" ? "freeAperture" : "apertureDiameter"))}</span>
          <input data-id="${element.id}" data-field="diameter" type="number" min="1" step="0.1" value="${escapeHtml(element.diameter)}">
        </label>

        ${extraFields}
      </div>
    </article>
  `;
}

function describePosition(index) {
  if (index === 0) {
    return t("firstElementInfo");
  }

  const previous = state.elements[index - 1];
  const current = state.elements[index];
  const distance = formatNumber(current.position - previous.position);
  return t("afterElement", {
    distance,
    previous: getElementDisplayLabel(previous),
  });
}

function describeImageCase(imageDistance, magnification) {
  if (!Number.isFinite(imageDistance) || !Number.isFinite(magnification)) {
    return t("imageAtInfinity");
  }

  const reality = imageDistance > 0 ? t("realWord") : t("virtualWord");
  const orientation = magnification < 0 ? t("invertedWord") : t("uprightWord");
  const scale = Math.abs(magnification) > 1.05
    ? t("magnifiedWord")
    : Math.abs(magnification) < 0.95
      ? t("reducedWord")
      : t("sameSizeWord");

  return t("imageCaseTemplate", {
    reality,
    orientation,
    scale,
    imageWord: t("imageWord"),
  }).trim();
}

function computeSystem(config) {
  const objectZ = -config.object.distance;
  const elements = [...config.elements].sort(sortByPosition);
  const lenses = elements.filter((element) => element.type === "lens");
  const hasPoweredLens = lenses.some((lens) => Math.abs(lens.power) > EPSILON);

  const matrixSteps = [];
  const enrichedElements = [];
  let currentMatrix = identityMatrix();
  let previousZ = objectZ;

  for (const element of elements) {
    const distance = element.position - previousZ;
    const transfer = translationMatrix(distance);
    const matrixBefore = multiplyMatrices(transfer, currentMatrix);

    matrixSteps.push({
      kind: "space",
      label: t("spaceToLabel", { label: getElementDisplayLabel(element) }),
      distance,
      matrix: transfer,
      cumulative: matrixBefore,
    });

    let matrixAfter = matrixBefore;
    let focalLength = null;

    if (element.type === "lens") {
      focalLength = powerToFocalLength(element.power);
      const matrix = Number.isFinite(focalLength) ? lensMatrix(focalLength) : identityMatrix();
      matrixAfter = multiplyMatrices(matrix, matrixBefore);
      matrixSteps.push({
        kind: "lens",
        label: getElementDisplayLabel(element),
        power: element.power,
        focalLength,
        matrix,
        cumulative: matrixAfter,
      });
    } else {
      matrixSteps.push({
        kind: "aperture",
        label: getElementDisplayLabel(element),
        diameter: element.diameter,
        matrix: identityMatrix(),
        cumulative: matrixAfter,
      });
    }

    enrichedElements.push({
      ...element,
      displayLabel: getElementDisplayLabel(element),
      gapFromPrevious: distance,
      matrixBefore,
      matrixAfter,
      focalLength,
      radius: Math.max(0.5, element.diameter / 2),
    });

    currentMatrix = matrixAfter;
    previousZ = element.position;
  }

  const overallMatrix = currentMatrix;
  const [, b] = overallMatrix[0];
  const [, d] = overallMatrix[1];
  const lastPosition = elements.length ? elements[elements.length - 1].position : 0;

  let imageDistance = null;
  let imagePosition = null;
  let imageHeight = null;
  let magnification = null;
  let imageNature = t("noImage");

  if (hasPoweredLens && Math.abs(d) > EPSILON) {
    imageDistance = -b / d;
    imagePosition = lastPosition + imageDistance;
    magnification = 1 / d;
    imageHeight = magnification * config.object.height;
    imageNature = describeImageCase(imageDistance, magnification);
  } else if (hasPoweredLens) {
    imageNature = t("imageAtInfinity");
  }

  const imagePlaneMatrix = Number.isFinite(imageDistance)
    ? multiplyMatrices(translationMatrix(imageDistance), overallMatrix)
    : null;

  const apertureStop = findApertureStop(enrichedElements);
  const imageRays = apertureStop
    ? buildImageRays({
        objectY: config.object.height,
        objectZ,
        apertureStop,
        elements: enrichedElements,
        imagePosition,
        lastPosition,
      })
    : [];

  const apertureRays = apertureStop
    ? buildApertureRays({
        objectZ,
        apertureStop,
        elements: enrichedElements,
        imagePosition,
        lastPosition,
      })
    : [];

  const sequentialSteps = buildSequentialLensSteps({
    objectZ,
    objectHeight: config.object.height,
    lenses,
  });

  const distances = buildDistanceSummary({
    objectZ,
    elements: enrichedElements,
    imagePosition,
  });

  const notes = [];
  if (!lenses.length) {
    notes.push({ tone: "warning", text: t("needLensNote") });
  }
  if (hasPoweredLens && !Number.isFinite(imageDistance)) {
    notes.push({ tone: "warning", text: t("infinityNote") });
  }
  if (apertureStop) {
    notes.push({
      tone: "success",
      text: t("apertureStopNote", {
        label: apertureStop.displayLabel,
        radius: formatNumber(apertureStop.radius),
      }),
    });
  }

  for (const ray of [...imageRays, ...apertureRays]) {
    if (ray.clippedBy) {
      notes.push({
        tone: "warning",
        text: t("clippedRayNote", {
          ray: ray.label,
          element: ray.clippedBy,
        }),
      });
    }
  }

  return {
    config,
    objectZ,
    elements,
    enrichedElements,
    lenses,
    hasPoweredLens,
    overallMatrix,
    imagePlaneMatrix,
    imageDistance,
    imagePosition,
    imageHeight,
    magnification,
    imageNature,
    apertureStop,
    imageRays,
    apertureRays,
    sequentialSteps,
    matrixSteps,
    distances,
    notes,
  };
}

function buildSequentialLensSteps({ objectZ, objectHeight, lenses }) {
  const steps = [];
  let currentObjectPosition = objectZ;
  let currentObjectHeight = objectHeight;
  let objectAtInfinity = false;

  for (const lens of lenses) {
    const focalLength = powerToFocalLength(lens.power);

    if (!Number.isFinite(focalLength)) {
      steps.push({
        label: getElementDisplayLabel(lens),
        power: lens.power,
        focalLength: null,
        note: t("noFocusNote"),
      });
      continue;
    }

    const objectDistance = objectAtInfinity ? Infinity : lens.position - currentObjectPosition;
    let imageDistance = null;
    let imagePosition = null;
    let magnification = null;
    let imageHeight = null;
    let note = "";

    if (!Number.isFinite(objectDistance)) {
      imageDistance = focalLength;
      imagePosition = lens.position + focalLength;
      note = t("parallelImageNote");
      currentObjectPosition = imagePosition;
      currentObjectHeight = null;
      objectAtInfinity = false;
    } else if (Math.abs((1 / focalLength) - (1 / objectDistance)) < EPSILON) {
      imageDistance = Infinity;
      imagePosition = Infinity;
      note = t("infiniteIntermediateNote");
      objectAtInfinity = true;
      currentObjectPosition = Infinity;
      currentObjectHeight = null;
    } else {
      imageDistance = 1 / ((1 / focalLength) - (1 / objectDistance));
      imagePosition = lens.position + imageDistance;
      magnification = -imageDistance / objectDistance;
      imageHeight = currentObjectHeight === null ? null : currentObjectHeight * magnification;
      note = objectDistance > 0 ? t("realObjectNote") : t("virtualObjectNote");
      currentObjectPosition = imagePosition;
      currentObjectHeight = imageHeight;
      objectAtInfinity = false;
    }

    steps.push({
      label: getElementDisplayLabel(lens),
      power: lens.power,
      focalLength,
      objectDistance,
      imageDistance,
      magnification,
      imageHeight,
      imagePosition,
      note,
    });
  }

  return steps;
}

function buildDistanceSummary({ objectZ, elements, imagePosition }) {
  const list = [];

  if (elements.length) {
    list.push({
      title: t("objectToFirstElement"),
      value: `${formatNumber(elements[0].position - objectZ)} mm`,
    });
  }

  for (let index = 1; index < elements.length; index += 1) {
    list.push({
      title: t("elementToElement", {
        from: elements[index - 1].displayLabel || getElementDisplayLabel(elements[index - 1]),
        to: elements[index].displayLabel || getElementDisplayLabel(elements[index]),
      }),
      value: `${formatNumber(elements[index].position - elements[index - 1].position)} mm`,
    });
  }

  if (elements.length && Number.isFinite(imagePosition)) {
    const last = elements[elements.length - 1];
    list.push({
      title: t("lastElementToImage", {
        last: last.displayLabel || getElementDisplayLabel(last),
      }),
      value: `${formatNumber(imagePosition - last.position)} mm`,
    });
  }

  if (Number.isFinite(imagePosition)) {
    list.push({
      title: t("absoluteImagePosition"),
      value: `${formatNumber(imagePosition)} mm`,
    });
  }

  return list;
}

function buildImageRays({ objectY, objectZ, apertureStop, elements, imagePosition, lastPosition }) {
  const radius = apertureStop.radius;
  const targets = [
    { label: t("principalRay"), targetY: 0, color: "#0d8b8d" },
    { label: t("upperMarginalRay"), targetY: radius, color: "#d38b2e" },
    { label: t("lowerMarginalRay"), targetY: -radius, color: "#d55d42" },
  ];

  return targets.map((target) => {
    const slope = solveSlopeToPlane({
      objectY,
      targetY: target.targetY,
      plane: apertureStop,
      objectZ,
    });

    return traceRay({
      label: target.label,
      color: target.color,
      objectY,
      initialSlope: slope,
      objectZ,
      elements,
      imagePosition,
      lastPosition,
    });
  });
}

function buildApertureRays({ objectZ, apertureStop, elements, imagePosition, lastPosition }) {
  const radius = apertureStop.radius;
  const targets = [
    { label: t("upperApertureRay"), targetY: radius, color: "#0d8b8d" },
    { label: t("lowerApertureRay"), targetY: -radius, color: "#d38b2e" },
  ];

  return targets.map((target) => {
    const slope = solveSlopeToPlane({
      objectY: 0,
      targetY: target.targetY,
      plane: apertureStop,
      objectZ,
    });

    return traceRay({
      label: target.label,
      color: target.color,
      objectY: 0,
      initialSlope: slope,
      objectZ,
      elements,
      imagePosition,
      lastPosition,
    });
  });
}

function renderCalculationBlocks(result) {
  const stopText = result.apertureStop
    ? `${result.apertureStop.displayLabel || result.apertureStop.label} (${formatNumber(result.apertureStop.diameter)} mm)`
    : t("noLimit");
  const overviewMetrics = [
    renderCalcMetricCard(t("objectDistanceLabel"), `${formatNumber(result.config.object.distance)} mm`),
    renderCalcMetricCard(t("objectHeightLabel"), `${formatNumber(result.config.object.height)} mm`),
    renderCalcMetricCard(t("summaryImageCaseTitle"), result.imageNature),
    renderCalcMetricCard(t("summaryImageDistanceTitle"), formatCalcDistanceText(result.imageDistance, result.hasPoweredLens)),
    renderCalcMetricCard(t("summaryMagnificationTitle"), formatCalcMagnificationText(result.magnification)),
    renderCalcMetricCard(t("summaryImageSizeTitle"), formatCalcSignedMillimeterText(result.imageHeight)),
    renderCalcMetricCard(t("summaryApertureLimitTitle"), stopText),
    renderCalcMetricCard(t("summarySystemMatrixTitle"), formatMatrix(result.overallMatrix), { code: true, wide: true }),
  ].join("");

  const matrixSequence = result.matrixSteps.length
    ? result.matrixSteps.map((step, index) => renderCalcSequenceStep(step, index)).join("")
    : `<div class="empty-state">${escapeHtml(t("calcNoLensSteps"))}</div>`;
  const derivedLines = buildCalcDerivedLines(result);
  const derivedMarkup = derivedLines.length
    ? `
      <div class="calc-derived">
        ${derivedLines.map((line) => `
          <article class="calc-formula-item">
            <code class="calc-inline-code calc-inline-code--wrap">${escapeHtml(line)}</code>
          </article>
        `).join("")}
      </div>
    `
    : "";

  const stepCards = result.sequentialSteps.length
    ? result.sequentialSteps.map((step) => renderCalcLensStepCard(step)).join("")
    : `<div class="empty-state">${escapeHtml(t("calcNoLensSteps"))}</div>`;

  return `
    ${renderCalcAccordion(
      t("resultsTitle"),
      `<div class="calc-metric-grid">${overviewMetrics}</div>`,
      "overview"
    )}
    ${renderCalcAccordion(
      t("calcSystemMatrixTitle"),
      `<div class="calc-sequence">${matrixSequence}</div>${derivedMarkup}`
    )}
    ${renderCalcAccordion(
      t("calcIntermediateTitle"),
      `<div class="step-grid">${stepCards}</div>`
    )}
  `;
}

function renderCalcAccordion(title, body, variant = "") {
  const className = variant ? `calc-accordion calc-accordion--${variant}` : "calc-accordion";

  return `
    <details class="${className}">
      <summary class="calc-accordion__summary">
        <span class="calc-accordion__title">${escapeHtml(title)}</span>
      </summary>
      <div class="calc-accordion__content">
        ${body}
      </div>
    </details>
  `;
}

function renderCalcMetricCard(label, value, options = {}) {
  const className = options.wide ? "calc-metric calc-metric--wide" : "calc-metric";
  const content = options.code
    ? `<code class="calc-inline-code calc-inline-code--wrap">${escapeHtml(value)}</code>`
    : `<strong class="calc-metric__value">${escapeHtml(value)}</strong>`;

  return `
    <article class="${className}">
      <span class="calc-metric__label">${escapeHtml(label)}</span>
      ${content}
    </article>
  `;
}

function renderCalcSequenceStep(step, index) {
  const typeLabel = step.kind === "space"
    ? "T"
    : step.kind === "lens"
      ? t("lens")
      : t("aperture");

  return `
    <details class="calc-sequence-step">
      <summary class="calc-sequence-step__summary">
        <div class="calc-sequence-step__head">
          <span class="calc-sequence-step__index">${index + 1}</span>
          <div class="calc-sequence-step__titles">
            <strong>${escapeHtml(step.label)}</strong>
            <span class="calc-sequence-step__type">${escapeHtml(typeLabel)}</span>
          </div>
        </div>
      </summary>
      <div class="calc-sequence-step__content">
        <code class="calc-inline-code calc-inline-code--wrap">${escapeHtml(buildCalcMatrixFormula(step))}</code>
        <div class="calc-sequence-step__matrix">
          <span class="calc-sequence-step__matrix-label">M_total</span>
          <code class="calc-inline-code calc-inline-code--wrap">${escapeHtml(formatMatrix(step.cumulative))}</code>
        </div>
      </div>
    </details>
  `;
}

function renderCalcLensStepCard(step) {
  const lines = [];
  const infinitySymbol = "\u221E";

  if (Number.isFinite(step.focalLength)) {
    lines.push(t("stepFocalLengthLine", {
      power: formatNumber(step.power),
      focal: formatNumber(step.focalLength),
    }));
  }
  if ("objectDistance" in step) {
    lines.push(t("stepObjectDistanceLine", {
      value: Number.isFinite(step.objectDistance) ? `${formatNumber(step.objectDistance)} mm` : infinitySymbol,
    }));
  }
  if ("imageDistance" in step) {
    lines.push(t("stepImageDistanceLine", {
      value: Number.isFinite(step.imageDistance) ? `${formatNumber(step.imageDistance)} mm` : infinitySymbol,
    }));
  }
  if (Number.isFinite(step.magnification)) {
    lines.push(t("stepMagnificationLine", {
      value: formatNumber(step.magnification),
    }));
  }
  if (Number.isFinite(step.imageHeight)) {
    lines.push(t("stepImageHeightLine", {
      value: formatNumber(step.imageHeight),
    }));
  }

  return `
    <article class="step-card step-card--calc">
      <strong>${escapeHtml(step.label)}</strong>
      <div class="step-card__values">
        ${lines.map((line) => `
          <article class="calc-formula-item">
            <code class="calc-inline-code calc-inline-code--wrap">${escapeHtml(line)}</code>
          </article>
        `).join("")}
      </div>
      <p class="step-card__note">${escapeHtml(step.note)}</p>
    </article>
  `;
}

function buildCalcMatrixFormula(step) {
  const infinitySymbol = "\u221E";

  if (step.kind === "space") {
    return t("matrixSpaceLine", {
      label: step.label,
      distance: formatNumber(step.distance),
      matrix: formatMatrix(step.matrix),
    });
  }

  if (step.kind === "lens") {
    const focal = Number.isFinite(step.focalLength) ? `f = ${formatNumber(step.focalLength)} mm` : `f = ${infinitySymbol}`;
    return t("matrixLensLine", {
      label: step.label,
      focal,
      power: formatNumber(step.power),
      matrix: formatMatrix(step.matrix),
    });
  }

  return t("matrixApertureLine", {
    label: step.label,
    diameter: formatNumber(step.diameter),
    matrix: formatMatrix(step.matrix),
  });
}

function buildCalcDerivedLines(result) {
  if (Number.isFinite(result.imageDistance) && result.imagePlaneMatrix) {
    return [
      t("matrixImagePlaneLine", { distance: formatNumber(result.imageDistance) }),
      t("matrixImagePlaneMatrixLine", { matrix: formatMatrix(result.imagePlaneMatrix) }),
      t("matrixMagnificationLine", { value: formatNumber(result.magnification) }),
      t("matrixImageHeightLine", { value: formatNumber(result.imageHeight) }),
    ];
  }

  if (result.hasPoweredLens) {
    return [t("matrixInfinityLine")];
  }

  return [];
}

function formatCalcDistanceText(value, hasPoweredLens) {
  if (Number.isFinite(value)) {
    return `${formatNumber(value)} mm`;
  }
  return hasPoweredLens ? t("infinityValue") : t("undefinedValue");
}

function formatCalcSignedMillimeterText(value) {
  return Number.isFinite(value) ? `${formatNumber(value)} mm` : t("undefinedValue");
}

function formatCalcMagnificationText(value) {
  return Number.isFinite(value) ? `${formatNumber(value)}x` : t("undefinedValue");
}
