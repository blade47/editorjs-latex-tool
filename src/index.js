import KaTeX from 'katex';
import 'katex/dist/katex.min.css';

import './index.css';

class LatexTool {
  static get toolbox() {
    return {
      title: 'Equations',
      icon: `<svg version="1.0" xmlns="http://www.w3.org/2000/svg"
 width="1280.000000pt" height="1238.000000pt" viewBox="0 0 1280.000000 1238.000000"
 preserveAspectRatio="xMidYMid meet">
<metadata>
Created by potrace 1.15, written by Peter Selinger 2001-2017
</metadata>
<g transform="translate(0.000000,1238.000000) scale(0.100000,-0.100000)"
fill="#000000" stroke="none">
<path d="M5773 12140 c-1790 -34 -2748 -130 -3403 -342 -708 -229 -1072 -593
-1422 -1423 -71 -168 -119 -291 -403 -1045 -60 -157 -154 -400 -210 -540 -98
-243 -102 -255 -81 -261 11 -3 113 -12 225 -19 l204 -13 19 24 c48 61 136 200
238 378 218 379 326 535 494 709 186 193 357 318 591 433 284 138 589 218
1000 260 169 17 650 15 865 -5 96 -9 178 -16 183 -16 14 0 -9 -668 -38 -1095
-126 -1847 -496 -3368 -1125 -4625 -249 -497 -510 -917 -911 -1465 -484 -662
-554 -766 -648 -960 -85 -174 -131 -348 -131 -491 0 -94 27 -287 55 -389 95
-350 313 -638 622 -822 294 -174 620 -234 954 -174 725 128 1165 652 1463
1744 159 581 282 1314 400 2377 89 794 130 1247 311 3375 63 748 136 1587 161
1865 25 278 48 542 51 588 l6 82 1358 0 1359 0 0 -34 c0 -50 -37 -581 -66
-951 -35 -454 -102 -1182 -194 -2115 -102 -1032 -141 -1456 -184 -1970 -115
-1365 -158 -2454 -113 -2805 49 -372 132 -662 273 -944 333 -671 908 -1079
1689 -1197 137 -21 562 -30 707 -15 932 96 1668 715 2127 1789 107 250 214
585 276 865 57 259 105 624 105 799 l0 68 -235 0 -235 0 0 -44 c0 -132 -58
-441 -112 -595 -196 -565 -610 -877 -1228 -926 -94 -7 -294 8 -405 31 -491
101 -809 434 -980 1029 -157 545 -184 1396 -85 2620 26 310 55 624 120 1290
107 1099 145 1536 175 2050 18 315 35 747 35 908 l0 119 1308 -6 c719 -4 1383
-9 1475 -12 l168 -6 -6 794 c-3 436 -8 861 -11 944 l-6 151 -996 6 c-1693 12
-5323 16 -5789 7z"/>
</g>
</svg>`,
    };
  }

  constructor({ data, config }) {
    this.data = data || {};
    this.config = config || {};
    this.data.equations = this.data.equations || [''];
    this.data.multilineEquations = this.data.multilineEquations ?? false;
    this.state = { ...this.data };
    this.wrapper = undefined;
    this.toggleEquationOverlay = this.toggleEquationOverlay.bind(this);
    this.saveEquationState = this.saveEquationState.bind(this);
    this.repositionEquationArea = this.repositionEquationArea.bind(this);
    this.createEquationArea = this.createEquationArea.bind(this);
    this.createEquationOverlay = this.createEquationOverlay.bind(this);
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('latex-tool-wrapper');

    this.output = document.createElement('div');
    this.output.id = 'output-latex-tool';
    this.wrapper.appendChild(this.output);
    this.output.onclick = this.saveEquationState;

    this.renderLatex();

    return this.wrapper;
  }

  createEquationOverlay() {
    this.equationOverlay = document.createElement('div');
    this.equationOverlay.classList.add('latex-tool-equation-overlay');

    const multilineContainer = document.createElement('div');
    multilineContainer.classList.add('latex-tool-multiline-container');
    const multilineEquationsInput = document.createElement('input');
    multilineEquationsInput.type = 'checkbox';
    multilineEquationsInput.id = 'latex-tool-multiline-equations';

    multilineEquationsInput.checked = this.state.multilineEquations;
    multilineEquationsInput.onchange = (e) => {
      this.state.multilineEquations = e.target.checked;
      this.renderLatex();
    };

    multilineContainer.appendChild(multilineEquationsInput);

    const label = document.createElement('label');
    label.setAttribute('for', 'latex-tool-multiline-equations');
    label.innerText = 'Multi line equations';
    multilineContainer.appendChild(label);
    this.equationOverlay.appendChild(multilineContainer);

    const eqWrapper = this.createEquationArea(this.state.equations.join('\n'));
    this.equationOverlay.appendChild(eqWrapper);
    this.disconnectObserver = this.observeEquationOverlayResize(this.equationOverlay);
    this.wrapper.appendChild(this.equationOverlay);
  }

  stopEventPropagation(event) {
    event.stopPropagation();
  }

  toggleEquationOverlay(e) {
    this.stopEventPropagation(e);
    if (!this.equationOverlay) {
      this.createEquationOverlay();
      this.repositionEquationArea();
      this.equationOverlay.addEventListener('click', this.stopEventPropagation);
      document.body.addEventListener('click', this.toggleEquationOverlay);
    } else {
      document.body.removeEventListener('click', this.toggleEquationOverlay);
      this.equationOverlay.removeEventListener('click', this.stopEventPropagation);
      this.disconnectObserver();
      this.equationOverlay.remove();
      this.equationOverlay = undefined;
    }
  }

  createEquationArea(equation) {
    const equationArea = document.createElement('div');
    equationArea.classList.add('latex-tool-equation-area');

    this.textAreaWrapper = document.createElement('div');
    this.textAreaWrapper.classList.add('latex-tool-equation-textarea-wrapper');
    const textarea = document.createElement('textarea');
    textarea.id = 'latex-tool-equation-textarea';
    textarea.placeholder = 'Write LaTeX code here...';
    textarea.value = equation;
    textarea.classList.add('latex-tool-equation-textarea');
    textarea.oninput = (event) => {
      this.state.equations = event.target.value.trim().split('\n');
      this.renderLatex();
    };
    textarea.onkeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        this.saveEquationState(event);
      }
    };

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.classList.add('latex-tool-button-wrapper');
    const doneButton = document.createElement('button');
    doneButton.innerText = 'Done ↵';
    doneButton.classList.add('latex-tool-done-button', 'latex-tool-done-button-color');
    doneButton.onclick = this.saveEquationState;

    buttonsWrapper.appendChild(doneButton);
    this.textAreaWrapper.appendChild(textarea);
    equationArea.appendChild(this.textAreaWrapper);
    equationArea.appendChild(buttonsWrapper);
    textarea.focus();
    return equationArea;
  }

  saveEquationState(e) {
    this.toggleEquationOverlay(e);
    this.data = { ...this.state };
  }

  renderLatex() {
    const filteredEquations = this.state.equations
      .map((eq) => eq.trim())
      .filter((eq) => eq.length > 0);
    const equations = this.state.multilineEquations
      ? filteredEquations
      : [filteredEquations.join(' ')];
    if (equations.length === 0) {
      this.output.textContent = ''; // Clear the output if there are no equations
      return;
    }
    const systemOfEquations =
      equations.length > 1
        ? `\\left\\{ \\begin{aligned} ${equations.join(' \\\\ ')} \\end{aligned} \\right.`
        : `\\begin{aligned} ${equations[0]} \\end{aligned}`;

    try {
      KaTeX.render(systemOfEquations, this.output, {
        throwOnError: false,
      });
    } catch (error) {
      this.output.textContent = error.message;
    }
  }

  repositionEquationArea() {
    const overlayRect = this.equationOverlay.getBoundingClientRect();
    const overlayHeight = overlayRect.height;

    const maxHeight =
      this.config.repositionOverlay?.(this.wrapper, this.equationOverlay) ??
      this.repositionOverlay(this.wrapper, this.equationOverlay, this.config.bufferSpacing ?? 0);

    const textAreaWrapperRect = this.textAreaWrapper.getBoundingClientRect();
    this.textAreaWrapper.style.maxHeight = `${maxHeight * (textAreaWrapperRect.height / overlayHeight)}px`; // Adjust textarea height
  }

  repositionOverlay(target, overlay, bufferSpacing) {
    const overlayRect = overlay.getBoundingClientRect();
    const overlayHeight = overlayRect.height;
    const targetRect = target.getBoundingClientRect();
    const spacing = 10;

    // Calculate available space
    const spaceAbove = targetRect.top;
    const spaceBelow = window.innerHeight - targetRect.bottom;

    // Decide position and height
    let top;
    let maxHeight;
    if (spaceBelow >= overlayHeight || spaceBelow >= spaceAbove) {
      // Position below
      top = targetRect.height + spacing;
      maxHeight = spaceBelow - spacing - bufferSpacing;
    } else {
      // Position above
      maxHeight = spaceAbove - spacing - bufferSpacing;
      top = -Math.min(overlayHeight, maxHeight) - spacing;
    }

    overlay.style.top = `${top}px`;
    overlay.style.maxHeight = `${maxHeight}px`;
    return maxHeight;
  }

  observeEquationOverlayResize(element) {
    const resizeObserver = new ResizeObserver(() => {
      this.repositionEquationArea();
    });
    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }

  save(blockContent) {
    return {
      ...this.data,
    };
  }
}

export default LatexTool;
