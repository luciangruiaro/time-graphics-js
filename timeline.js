
/**
 * Timeline Implementation
 */

class Timeline {
    constructor(containerId, dataUrl) {
        this.container = document.getElementById(containerId);
        this.dataUrl = dataUrl;
        this.data = null;
        this.svg = null;
        this.width = 0;
        this.height = 0;

        // Layout Config
        this.padding = { top: 40, right: 20, bottom: 40, left: 20 };
        this.trackHeight = 100; // Base height for a track
        this.axisHeight = 30;   // Height of the central time axis

        // State
        this.timeScale = null;
        this.tooltip = null;

        // Initialize
        this.init();
    }

    async init() {
        try {
            const response = await fetch(this.dataUrl);
            this.data = await response.json();

            this.createTooltip();
            this.setupSVG();
            this.processData();
            this.render();

            // Handle resize
            window.addEventListener('resize', () => {
                this.updateDimensions();
                this.render();
            });

        } catch (error) {
            console.error("Failed to load timeline data:", error);
            this.container.innerHTML = `<div style="padding: 20px; color: red;">Error loading data: ${error.message}</div>`;
        }
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        this.container.appendChild(this.tooltip);
    }

    setupSVG() {
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        this.container.appendChild(this.svg);
        this.updateDimensions();
    }

    updateDimensions() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
    }

    processData() {
        // Parse global start/end dates
        this.startDate = new Date(this.data.settings.start);
        this.endDate = new Date(this.data.settings.end);

        // Helper to parse item dates
        this.data.items.forEach(item => {
            if (item.start) item._start = new Date(item.start);
            if (item.end) item._end = new Date(item.end);
            else if (item.type === 'range' || item.type === 'band') item._end = new Date(); // Ongoing defaults to now

            if (item.date) item._date = new Date(item.date);
        });
    }

    // Map a date object to an X coordinate
    getX(date) {
        const totalMs = this.endDate - this.startDate;
        const currentMs = date - this.startDate;
        const percent = currentMs / totalMs;

        // Map to drawable area width
        const drawableWidth = this.width - this.padding.left - this.padding.right;
        return this.padding.left + (percent * drawableWidth);
    }

    render() {
        if (!this.data || !this.svg) return;

        // Clear previous content
        this.svg.innerHTML = '';

        // 1. Draw Central Axis
        this.drawAxis();

        // 2. Calculate Track Layouts
        // We split tracks into 'top' and 'bottom' groups relative to the axis
        const topTracks = this.data.settings.tracks.filter(t => t.position === 'top');
        const bottomTracks = this.data.settings.tracks.filter(t => t.position === 'bottom');

        const centerY = this.height / 2;

        // Draw Top Tracks (going up from center)
        let currentY = centerY - (this.axisHeight / 2);
        topTracks.forEach(track => {
            const trackH = this.trackHeight; // Could be dynamic later
            const y = currentY - trackH;
            this.drawTrack(track, y, trackH);
            currentY = y;
        });

        // Draw Bottom Tracks (going down from center)
        currentY = centerY + (this.axisHeight / 2);
        bottomTracks.forEach(track => {
            const trackH = this.trackHeight;
            const y = currentY;
            this.drawTrack(track, y, trackH);
            currentY = y + trackH;
        });

        // 3. Draw Bands (Backgrounds that span everything)
        // We draw these behind items but maybe on top of track backgrounds? 
        // For now, let's draw them first so they are in the background.
        const bands = this.data.items.filter(i => i.type === 'band');
        bands.forEach(band => this.drawBand(band));

        // 4. Draw Items per track
        // We need to know where each track is rendered to place items correctly.
        // Let's re-calculate or store track positions.
        // For simplicity, I'll recalculate the Y ranges for tracks here.

        const trackYPositions = {};

        // Top tracks again
        currentY = centerY - (this.axisHeight / 2);
        topTracks.forEach(track => {
            const y = currentY - this.trackHeight;
            trackYPositions[track.id] = { y: y, height: this.trackHeight };
            currentY = y;
        });

        // Bottom tracks again
        currentY = centerY + (this.axisHeight / 2);
        bottomTracks.forEach(track => {
            const y = currentY;
            trackYPositions[track.id] = { y: y, height: this.trackHeight };
            currentY = y + this.trackHeight;
        });

        // Filter non-band items
        const items = this.data.items.filter(i => i.type !== 'band');

        items.forEach(item => {
            const trackPos = trackYPositions[item.track];
            if (trackPos) {
                this.drawItem(item, trackPos);
            }
        });
    }

    drawAxis() {
        const centerY = this.height / 2;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", this.padding.left);
        line.setAttribute("y1", centerY);
        line.setAttribute("x2", this.width - this.padding.right);
        line.setAttribute("y2", centerY);
        line.setAttribute("class", "axis-line");
        this.svg.appendChild(line);

        // Draw simple year ticks
        const startYear = this.startDate.getFullYear();
        const endYear = this.endDate.getFullYear();

        for (let year = startYear; year <= endYear; year++) {
            const date = new Date(year, 0, 1);
            const x = this.getX(date);

            // Don't draw if out of bounds
            if (x < this.padding.left || x > this.width - this.padding.right) continue;

            // Tick line
            const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
            tick.setAttribute("x1", x);
            tick.setAttribute("y1", centerY - 5);
            tick.setAttribute("x2", x);
            tick.setAttribute("y2", centerY + 5);
            tick.setAttribute("stroke", "#cbd5e1");
            this.svg.appendChild(tick);

            // Label
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", x);
            label.setAttribute("y", centerY + 20);
            label.setAttribute("class", "tick-label");
            label.textContent = year;
            this.svg.appendChild(label);
        }
    }

    drawTrack(track, y, height) {
        // Track Background (Alternating or just visual separation)
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x", this.padding.left);
        bg.setAttribute("y", y);
        bg.setAttribute("width", this.width - this.padding.left - this.padding.right);
        bg.setAttribute("height", height);
        bg.setAttribute("fill", "transparent"); // Keep it clean for now, maybe add border
        // bg.setAttribute("stroke", "#f1f5f9");
        this.svg.appendChild(bg);

        // Track Label
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", this.padding.left);
        label.setAttribute("y", y + 10);
        label.setAttribute("class", "track-label");
        label.textContent = track.label;
        this.svg.appendChild(label);
    }

    drawBand(item) {
        const x1 = this.getX(item._start);
        const x2 = this.getX(item._end);

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x1);
        rect.setAttribute("y", this.padding.top); // Span full height minus padding
        rect.setAttribute("width", Math.max(1, x2 - x1));
        rect.setAttribute("height", this.height - this.padding.top - this.padding.bottom);
        rect.setAttribute("fill", item.color || this.data.settings.defaultColor);
        rect.setAttribute("class", "item-band");

        this.attachInteractions(rect, item);
        this.svg.appendChild(rect);
    }

    drawItem(item, trackPos) {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "item-group");

        // Determine Lane/Offset
        // Simple logic: if lane is specified, use it. Otherwise default to 0.
        // A real implementation would calculate overlaps.
        const laneHeight = 24;
        const laneGap = 4;
        const laneIndex = item.lane || 0;

        // Center items in track vertically if no lane, or stack them
        // Let's start from the top of the track + some padding
        const trackContentTop = trackPos.y + 25; // Space for label
        const y = trackContentTop + (laneIndex * (laneHeight + laneGap));

        const color = item.color || this.data.settings.defaultColor;

        if (item.type === 'range') {
            const x1 = this.getX(item._start);
            const x2 = this.getX(item._end);
            const width = Math.max(2, x2 - x1);

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x1);
            rect.setAttribute("y", y);
            rect.setAttribute("width", width);
            rect.setAttribute("height", laneHeight);
            rect.setAttribute("fill", color);
            rect.setAttribute("class", "item-range");
            group.appendChild(rect);

            // Label
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("class", "item-label");
            text.textContent = item.label;

            // Style: bar-in-label vs bar-below
            if (item.style === 'bar-below') {
                text.setAttribute("x", x1);
                text.setAttribute("y", y - 5);
                text.classList.add('outside');
            } else {
                // Default: inside
                // Check if text fits? For now just clip or hide if too small
                if (width > 50) {
                    text.setAttribute("x", x1 + 5);
                    text.setAttribute("y", y + (laneHeight / 2) + 4); // Vertical center approx
                } else {
                    // Hide or move outside if too small
                    text.setAttribute("x", x2 + 5);
                    text.setAttribute("y", y + (laneHeight / 2) + 4);
                    text.classList.add('outside');
                }
            }
            group.appendChild(text);

        } else if (item.type === 'milestone') {
            const x = this.getX(item._date);
            const cy = y + (laneHeight / 2);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", 6);
            circle.setAttribute("fill", color);
            circle.setAttribute("class", "item-milestone");
            group.appendChild(circle);

            // Label
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x + 10);
            text.setAttribute("y", cy + 4);
            text.setAttribute("class", "item-label outside");
            text.textContent = item.label;
            group.appendChild(text);
        }

        this.attachInteractions(group, item);
        this.svg.appendChild(group);
    }

    attachInteractions(element, item) {
        element.addEventListener('mouseenter', (e) => {
            if (item.desc) {
                this.showTooltip(e, item.desc);
            }
        });

        element.addEventListener('mousemove', (e) => {
            if (item.desc) {
                this.moveTooltip(e);
            }
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        if (item.url) {
            element.addEventListener('click', () => {
                window.open(item.url, '_blank');
            });
            element.style.cursor = 'pointer';
        }
    }

    showTooltip(e, text) {
        this.tooltip.textContent = text;
        this.tooltip.style.opacity = '1';
        this.moveTooltip(e);
    }

    moveTooltip(e) {
        // Position relative to container
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.tooltip.style.left = (x + 10) + 'px';
        this.tooltip.style.top = (y + 10) + 'px';
    }

    hideTooltip() {
        this.tooltip.style.opacity = '0';
    }
}

// Start the timeline
new Timeline('timeline-container', 'data.json');
