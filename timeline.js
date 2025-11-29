/**
 * Interactive Timeline - Embeddable & Exportable
 * 
 * EMBEDDING INSTRUCTIONS:
 * 
 * To embed this timeline in WordPress or any other page, use an iframe:
 * 
 * <iframe
 *   src="https://yourdomain.com/timeline/index.html?data=my-data.json"
 *   style="width: 100%; height: 600px; border: none;"
 *   loading="lazy"
 * ></iframe>
 * 
 * Query Parameters:
 * - data: Path to JSON file (default: "data.json")
 *   Example: ?data=career-timeline.json
 */

// Global state object
const state = {
    // Data
    items: [],          // parsed items from JSON
    settings: null,     // settings from JSON

    // Time Domain
    minDate: null,      // earliest timestamp (ms)
    maxDate: null,      // latest timestamp (ms)

    // Viewport & Transform
    zoom: 1,
    minZoom: 0.1,       // Minimum zoom level (zoomed out)
    maxZoom: 10,        // Maximum zoom level (zoomed in)
    panX: 0,
    pixelsPerDay: 2,    // Base scale

    // DOM References
    svg: null,
    contentGroup: null, // The <g> that holds all timeline content
    tooltip: null,

    // Interaction State
    isDragging: false,
    dragStartX: 0,
    dragStartPanX: 0,

    // Layout Constants
    layout: {
        axisY: 0,       // Calculated at runtime
        trackHeight: 60, // Base height per track
        trackGap: 60,   // Gap between tracks
        barHeight: 24,
        milestoneRadius: 6,
        trackLabelX: -120 // X offset for track labels
    }
};

const SVG_NS = "http://www.w3.org/2000/svg";

document.addEventListener("DOMContentLoaded", () => {
    initTimeline();
});

function initTimeline() {
    console.log("Timeline initializing...");

    // 1. Grab DOM references
    state.svg = document.getElementById("timeline-svg");
    state.tooltip = document.getElementById("timeline-tooltip");

    // 2. Setup Resize Listener (Responsive)
    window.addEventListener("resize", debounce(resizeTimeline, 100));

    // 3. Load Data
    loadData();
}

function loadData() {
    // Determine data source from query parameter or default
    const dataParam = getQueryParam("data");
    const dataUrl = dataParam || "data.json";

    console.log(`Loading timeline data from: ${dataUrl}`);

    // 1. Check for global data (for local file:// testing without CORS)
    if (window.TIMELINE_DATA && !dataParam) {
        console.log("Loaded data from window.TIMELINE_DATA");
        processLoadedData(window.TIMELINE_DATA);
        return;
    }

    // 2. Fetch from specified URL
    fetch(dataUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data loaded via fetch:", data);
            processLoadedData(data);
        })
        .catch(error => {
            console.error("Error loading timeline data:", error);
            showError(`Failed to load timeline data from "${dataUrl}": ${error.message}`);
        });
}

function processLoadedData(data) {
    try {
        // Parse Data & Setup State
        parseTimelineData(data);

        // Initial Setup
        setupSvg();

        // Create Export Controls
        createExportControls();
    } catch (error) {
        console.error("Error processing timeline data:", error);
        showError(`Error processing timeline data: ${error.message}`);
    }
}

function showError(message) {
    if (state.svg) {
        state.svg.innerHTML = `
            <text x="50%" y="50%" text-anchor="middle" fill="#c73a52" font-size="14">
                ${message}
            </text>
        `;
    }
}

/**
 * Parses raw JSON data into state
 */
function parseTimelineData(rawData) {
    state.settings = rawData.settings;

    // 1. Parse Settings Dates (as fallback)
    const settingsStart = new Date(state.settings.start).getTime();
    const settingsEnd = new Date(state.settings.end).getTime();

    let calculatedMin = Infinity;
    let calculatedMax = -Infinity;

    // 2. Parse Items
    state.items = rawData.items.map(item => {
        const parsedItem = { ...item }; // shallow copy

        if (item.type === 'range' || item.type === 'band') {
            parsedItem._startMs = new Date(item.start).getTime();

            if (item.end) {
                parsedItem._endMs = new Date(item.end).getTime();
            } else {
                parsedItem._endMs = Date.now(); // Use current date for ongoing items
                parsedItem._isOngoing = true;
            }

            // Track min/max from actual data
            calculatedMin = Math.min(calculatedMin, parsedItem._startMs);
            calculatedMax = Math.max(calculatedMax, parsedItem._endMs);

        } else if (item.type === 'milestone') {
            parsedItem._dateMs = new Date(item.date).getTime();

            // Track min/max from actual data
            calculatedMin = Math.min(calculatedMin, parsedItem._dateMs);
            calculatedMax = Math.max(calculatedMax, parsedItem._dateMs);
        }

        return parsedItem;
    });

    // 3. Set Global State Bounds from actual data (or fallback to settings)
    state.minDate = calculatedMin !== Infinity ? calculatedMin : settingsStart;
    state.maxDate = calculatedMax !== -Infinity ? calculatedMax : settingsEnd;

    // Add small padding (5% on each side) for better visualization
    const range = state.maxDate - state.minDate;
    const padding = range * 0.05;
    state.minDate -= padding;
    state.maxDate += padding;
}

/**
 * Sets up SVG structure, interactions, and initial draw
 */
function setupSvg() {
    // Apply background color from settings if provided
    if (state.settings.backgroundColor) {
        state.svg.style.backgroundColor = state.settings.backgroundColor;
        document.body.style.backgroundColor = state.settings.backgroundColor;
    }

    // Calculate initial scale based on container width
    calculateInitialScale();

    // Create Root Group
    state.svg.innerHTML = "";
    state.contentGroup = document.createElementNS(SVG_NS, "g");
    state.contentGroup.setAttribute("id", "timeline-content");
    state.svg.appendChild(state.contentGroup);

    // Calculate vertical center for axis
    const height = state.svg.clientHeight || 600;
    state.layout.axisY = height / 2;

    // Setup Interactions
    setupInteractions();

    // Draw Everything
    drawAll();
}

/**
 * Recalculates layout on window resize
 */
function resizeTimeline() {
    if (!state.svg || !state.settings) return;

    // Update dimensions
    const height = state.svg.clientHeight || 600;
    state.layout.axisY = height / 2;

    drawAll();
}

/**
 * Calculates a reasonable default pixelsPerDay
 */
function calculateInitialScale() {
    if (!state.svg) return;

    const svgWidth = state.svg.clientWidth || 800;
    const padding = 40;
    const usableWidth = svgWidth - (padding * 2);

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = (state.maxDate - state.minDate) / msPerDay;

    state.pixelsPerDay = usableWidth / totalDays;
    state.panX = padding;
}

/**
 * Maps a timestamp to an X coordinate (relative to start, before pan/zoom)
 */
function timeToX(timestamp) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysFromStart = (timestamp - state.minDate) / msPerDay;
    return (daysFromStart * state.pixelsPerDay);
}

/**
 * Main Draw Function - Orchestrates rendering order
 */
function drawAll() {
    if (!state.contentGroup) return;

    state.contentGroup.innerHTML = '';

    // Order matters for layering (Painter's Algorithm)
    drawBands();        // Background
    drawAxis();         // Middle ground
    drawTrackLabels();  // Middle ground
    drawItems();        // Foreground

    applyTransform();
}

/**
 * Draws background bands (type: "band")
 */
function drawBands() {
    const bands = state.items.filter(i => i.type === 'band');
    const svgHeight = state.svg.clientHeight || 600;

    bands.forEach(item => {
        const x1 = timeToX(item._startMs);
        const x2 = timeToX(item._endMs);
        const width = Math.max(x2 - x1, 1);

        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("x", x1);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", width);
        rect.setAttribute("height", svgHeight);
        rect.setAttribute("fill", item.color || state.settings.defaultColor);
        rect.setAttribute("fill-opacity", "0.15");

        attachTooltipEvents(rect, item);
        state.contentGroup.appendChild(rect);

        // Band Label (Top)
        const label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("x", x1 + 5);
        label.setAttribute("y", 20);
        label.setAttribute("font-size", "14");
        label.setAttribute("font-weight", "bold");
        label.setAttribute("fill", item.color || "#eeeeee");
        label.setAttribute("opacity", "0.6");
        label.textContent = item.label;
        state.contentGroup.appendChild(label);
    });
}

/**
 * Draws the central time axis with ticks
 */
function drawAxis() {
    const { minDate, maxDate, layout } = state;
    const axisY = layout.axisY;

    const startX = timeToX(minDate);
    const endX = timeToX(maxDate);

    // Main Axis Line
    const axisLine = document.createElementNS(SVG_NS, "line");
    axisLine.setAttribute("x1", startX - 50);
    axisLine.setAttribute("y1", axisY);
    axisLine.setAttribute("x2", endX + 50);
    axisLine.setAttribute("y2", axisY);
    axisLine.setAttribute("stroke", "#0de7e7");
    axisLine.setAttribute("stroke-width", "2");
    state.contentGroup.appendChild(axisLine);

    // Year Ticks
    const startYear = new Date(minDate).getFullYear();
    const endYear = new Date(maxDate).getFullYear();

    for (let year = startYear; year <= endYear; year++) {
        const dateMs = new Date(year, 0, 1).getTime();
        const x = timeToX(dateMs);

        // Tick
        const tick = document.createElementNS(SVG_NS, "line");
        tick.setAttribute("x1", x);
        tick.setAttribute("y1", axisY - 5);
        tick.setAttribute("x2", x);
        tick.setAttribute("y2", axisY + 5);
        tick.setAttribute("stroke", "#0de7e7");
        tick.setAttribute("stroke-width", "1");
        state.contentGroup.appendChild(tick);

        // Label
        const label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("x", x);
        label.setAttribute("y", axisY + 20);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "12");
        label.setAttribute("fill", "#eeeeee");
        label.textContent = year;
        state.contentGroup.appendChild(label);
    }
}

/**
 * Draws Track Labels on the left
 */
function drawTrackLabels() {
    const { settings, layout, minDate } = state;
    const tracks = settings.tracks;

    const labelX = timeToX(minDate) + layout.trackLabelX;

    tracks.forEach(track => {
        const y = getTrackBaseY(track.id);

        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("x", labelX);
        text.setAttribute("y", y);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("class", "track-label-text");
        text.textContent = track.label;

        state.contentGroup.appendChild(text);
    });
}

/**
 * Draws Range and Milestone items
 */
function drawItems() {
    const items = state.items.filter(i => i.type !== 'band');
    const { settings } = state;

    items.forEach(item => {
        const color = item.color || settings.defaultColor;
        const style = item.style || (item.type === 'range' ? 'bar-in-label' : 'point-label');

        if (item.type === 'range') {
            if (style === 'bar-below') {
                drawRangeItemBarBelow(item, color);
            } else {
                drawRangeItemBarInLabel(item, color);
            }
        } else if (item.type === 'milestone') {
            drawMilestonePointLabel(item, color);
        }
    });
}

// --- Item Style Renderers ---

function drawRangeItemBarInLabel(item, color) {
    const { layout } = state;
    const y = getItemY(item);
    const x1 = timeToX(item._startMs);
    const x2 = timeToX(item._endMs);
    const width = Math.max(x2 - x1, 2);

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "timeline-item");
    attachTooltipEvents(group, item);

    // Bar
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x1);
    rect.setAttribute("y", y - (layout.barHeight / 2));
    rect.setAttribute("width", width);
    rect.setAttribute("height", layout.barHeight);
    rect.setAttribute("fill", color);
    rect.setAttribute("rx", 4);
    group.appendChild(rect);

    // Label (Inside)
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", x1 + 5);
    text.setAttribute("y", y);
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "11");
    text.setAttribute("fill", "#2c2d2f");
    text.setAttribute("font-weight", "500");
    text.setAttribute("pointer-events", "none");
    text.textContent = item.label;

    if (width < 60) {
        text.setAttribute("display", "none");
    }
    group.appendChild(text);

    state.contentGroup.appendChild(group);
}

function drawRangeItemBarBelow(item, color) {
    const { layout } = state;
    const y = getItemY(item);
    const x1 = timeToX(item._startMs);
    const x2 = timeToX(item._endMs);
    const width = Math.max(x2 - x1, 2);

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "timeline-item");
    attachTooltipEvents(group, item);

    // Bar
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x1);
    rect.setAttribute("y", y - (layout.barHeight / 2));
    rect.setAttribute("width", width);
    rect.setAttribute("height", layout.barHeight);
    rect.setAttribute("fill", color);
    rect.setAttribute("rx", 4);
    group.appendChild(rect);

    // Label (Below)
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", x1);
    text.setAttribute("y", y + (layout.barHeight / 2) + 12);
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "11");
    text.setAttribute("fill", "#eeeeee");
    text.setAttribute("pointer-events", "none");
    text.textContent = item.label;

    group.appendChild(text);

    state.contentGroup.appendChild(group);
}

function drawMilestonePointLabel(item, color) {
    const { layout } = state;
    const y = getItemY(item);
    const x = timeToX(item._dateMs);

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "timeline-item");
    attachTooltipEvents(group, item);

    // Marker
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", layout.milestoneRadius);
    circle.setAttribute("fill", color);
    circle.setAttribute("stroke", "#2c2d2f");
    circle.setAttribute("stroke-width", "2");
    group.appendChild(circle);

    // Label (Next to point)
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", x + 10);
    text.setAttribute("y", y);
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "11");
    text.setAttribute("fill", "#eeeeee");
    text.textContent = item.label;
    group.appendChild(text);

    state.contentGroup.appendChild(group);
}

// --- Layout Helpers ---

function getTrackBaseY(trackId) {
    const { settings, layout } = state;
    const tracks = settings.tracks;

    const trackDef = tracks.find(t => t.id === trackId);
    if (!trackDef) return layout.axisY;

    const position = trackDef.position || 'top';
    const groupTracks = tracks.filter(t => t.position === position);
    const trackIndex = groupTracks.findIndex(t => t.id === trackId);

    const baseOffset = 60;
    const trackStep = layout.trackGap;

    let y = layout.axisY;

    if (position === 'top') {
        y -= (baseOffset + (trackIndex * trackStep));
    } else {
        y += (baseOffset + (trackIndex * trackStep));
    }

    return y;
}

function getItemY(item) {
    const { layout } = state;
    const baseY = getTrackBaseY(item.track);
    const laneOffset = (item.lane || 0) * (layout.barHeight + 6);
    return baseY + laneOffset;
}

// --- Interactions ---

function setupInteractions() {
    const svg = state.svg;

    // Panning
    svg.addEventListener("mousedown", (e) => {
        state.isDragging = true;
        state.dragStartX = e.clientX;
        state.dragStartPanX = state.panX;
        svg.style.cursor = "grabbing";
    });

    svg.addEventListener("mousemove", (e) => {
        if (!state.isDragging) return;
        e.preventDefault();

        const deltaX = e.clientX - state.dragStartX;
        state.panX = state.dragStartPanX + deltaX;

        applyTransform();
    });

    const stopDragging = () => {
        if (state.isDragging) {
            state.isDragging = false;
            svg.style.cursor = "default";
        }
    };

    svg.addEventListener("mouseup", stopDragging);
    svg.addEventListener("mouseleave", stopDragging);

    // Zooming
    svg.addEventListener("wheel", (e) => {
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        let newZoom = state.zoom * zoomFactor;
        newZoom = Math.max(state.minZoom, Math.min(newZoom, state.maxZoom));

        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const worldX = (mouseX - state.panX) / state.zoom;

        state.panX = mouseX - (worldX * newZoom);
        state.zoom = newZoom;

        applyTransform();
    }, { passive: false });
}

function applyTransform() {
    if (state.contentGroup) {
        state.contentGroup.setAttribute(
            "transform",
            `translate(${state.panX}, 0) scale(${state.zoom})`
        );
    }
}

// --- Export Functionality ---

function createExportControls() {
    const container = document.getElementById("timeline-container");
    if (!container) return;

    const btn = document.createElement("button");
    btn.textContent = "Export SVG";
    btn.id = "timeline-export-btn";
    btn.title = "Download timeline as SVG file";
    container.appendChild(btn);

    btn.addEventListener("click", exportTimelineAsSvg);
}

function exportTimelineAsSvg() {
    if (!state.svg) return;

    try {
        const svgClone = state.svg.cloneNode(true);
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

        const width = state.svg.clientWidth || 800;
        const height = state.svg.clientHeight || 600;
        svgClone.setAttribute("width", width);
        svgClone.setAttribute("height", height);

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgClone);
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

        const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "timeline.svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);

        console.log("Timeline exported as SVG");
    } catch (error) {
        console.error("Error exporting SVG:", error);
        alert("Failed to export timeline: " + error.message);
    }
}

// --- Tooltip Logic ---

function attachTooltipEvents(element, item) {
    element.addEventListener("mouseover", (e) => showTooltip(item, e));
    element.addEventListener("mousemove", (e) => moveTooltip(e));
    element.addEventListener("mouseout", hideTooltip);
}

function showTooltip(item, event) {
    const tooltip = state.tooltip;
    if (!tooltip) return;

    let dateStr = "";
    if (item.type === 'range' || item.type === 'band') {
        dateStr = `${formatDate(item._startMs)} - ${item._isOngoing ? 'Present' : formatDate(item._endMs)}`;
    } else if (item.type === 'milestone') {
        dateStr = formatDate(item._dateMs);
    }

    let content = `<strong>${item.label}</strong><br>`;
    content += `<span style="color: #0de7e7; font-size: 0.9em;">${dateStr}</span>`;

    if (item.desc) {
        content += `<br><div style="margin-top: 4px;">${item.desc}</div>`;
    }

    tooltip.innerHTML = content;
    tooltip.style.display = "block";
    moveTooltip(event);
}

function moveTooltip(event) {
    const tooltip = state.tooltip;
    if (!tooltip) return;

    const offsetX = 15;
    const offsetY = 15;
    tooltip.style.left = (event.clientX + offsetX) + "px";
    tooltip.style.top = (event.clientY + offsetY) + "px";
}

function hideTooltip() {
    if (state.tooltip) {
        state.tooltip.style.display = "none";
    }
}

function formatDate(ts) {
    const d = new Date(ts);
    return d.getFullYear();
}

// --- Utils ---

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
