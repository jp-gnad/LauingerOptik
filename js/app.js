const STORAGE_KEY = "lauinger-optik-state-v1";
const EPSILON = 1e-9;
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 420;
const AXIS_Y = SVG_HEIGHT / 2;
const PAD_X = 76;
const PAD_Y = 42;

const defaultState = {
  object: {
    distance: 320,
    height: 28,
  },
  elements: [
    {
      id: "lens-1",
      type: "lens",
      label: "Linse 1",
      position: 110,
      power: 5.5,
      diameter: 48,
    },
    {
      id: "aperture-1",
      type: "aperture",
      label: "Blende 1",
      position: 190,
      diameter: 24,
    },
    {
      id: "lens-2",
      type: "lens",
      label: "Linse 2",
      position: 330,
      power: 3.25,
      diameter: 44,
    },
  ],
};

let state = loadState();
let counters = buildCounters(state.elements);

const refs = {
  objectDistance: document.querySelector("#objectDistance"),
  objectHeight: document.querySelector("#objectHeight"),
  elementCount: document.querySelector("#elementCount"),
  elementList: document.querySelector("#elementList"),
  addLensButton: document.querySelector("#addLensButton"),
  addApertureButton: document.querySelector("#addApertureButton"),
  resetButton: document.querySelector("#resetButton"),
  heroStats: document.querySelector("#heroStats"),
  summaryCards: document.querySelector("#summaryCards"),
  calcSteps: document.querySelector("#calcSteps"),
  distanceSummary: document.querySelector("#distanceSummary"),
  notes: document.querySelector("#notes"),
  imageRaySvg: document.querySelector("#imageRaySvg"),
  apertureRaySvg: document.querySelector("#apertureRaySvg"),
};

initialize();

function initialize() {
  syncObjectInputs();
  renderControls();
  renderOutputs();
  bindEvents();
}

function bindEvents() {
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

function renderControls() {
  refs.elementCount.textContent = `${state.elements.length} Elemente`;
  refs.elementList.innerHTML = state.elements.length
    ? state.elements.map(renderElementCard).join("")
    : '<div class="empty-state">Noch keine Elemente vorhanden. Füge mindestens eine Linse hinzu.</div>';
}

function renderElementCard(element, index) {
  const distanceInfo = describePosition(index);
  const title = element.label || (element.type === "lens" ? `Linse ${index + 1}` : `Blende ${index + 1}`);
  const badge = element.type === "lens" ? "Linse" : "Blende";
  const extraFields = element.type === "lens"
    ? `
      <label class="field">
        <span>Brechkraft in dpt</span>
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
        <button class="remove-button" type="button" data-remove="${element.id}">Entfernen</button>
      </div>

      <div class="form-grid">
        <label class="field full-width">
          <span>Bezeichnung</span>
          <input data-id="${element.id}" data-field="label" type="text" value="${escapeHtml(title)}">
        </label>

        <label class="field">
          <span>Position</span>
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
  const labelPoint = ray.points[Math.max(1, Math.floor(ray.points.length / 2))];
  const label = labelPoint
    ? `<text class="svg-label" x="${geometry.toX(labelPoint.z) + 10}" y="${geometry.toY(labelPoint.y) - 10}">${escapeHtml(ray.label)}</text>`
    : "";

  return `
    <path class="svg-ray" d="${pathData}" stroke="${ray.color}"></path>
    ${extension}
    ${label}
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
