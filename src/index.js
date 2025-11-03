import KaTeX from 'katex';
import 'katex/dist/katex.min.css';
import { IconCurlyBrackets } from '@codexteam/icons';

import './index.css';
import { KATEX_DISPLAY_OPTIONS } from './katexMacros';

class LatexTool {
  static get toolbox() {
    return {
      title: 'Equations',
      icon: IconCurlyBrackets,
    };
  }

  constructor({ data, config, api }) {
    this.api = api;
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
      // Immediate render for checkbox toggle (no validation warnings here)
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
      // Render immediately for instant visual feedback
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

  /**
   * Renders LaTeX equations using KaTeX
   *
   * This method matches the backend rendering format to ensure
   * preview and PDF output are identical (WYSIWYG).
   *
   * Backend reference: Block.kt lines 46-59
   */
  renderLatex() {
    const filteredEquations = this.state.equations
      .map((eq) => eq.trim())
      .filter((eq) => eq.length > 0);

    if (filteredEquations.length === 0) {
      // Show placeholder to avoid validation warnings on empty state
      // and to reserve space for better overlay positioning
      this.output.innerHTML =
        '<div style="color: #9ca3af; font-style: italic; text-align: center; padding: 20px;">Click to add equations</div>';
      return;
    }

    // Determine if we should render as single line or multiple lines
    const equations = this.state.multilineEquations
      ? filteredEquations
      : [filteredEquations.join(' ')];

    /**
     * Match backend LaTeX format exactly:
     *
     * Single equation:
     * \begin{equation}
     * \begin{aligned}
     *   [equation]
     * \end{aligned}
     * \end{equation}
     *
     * Multiple equations (system):
     * \begin{equation}
     * \left\{
     * \begin{aligned}
     *   [eq1] \\
     *   [eq2] \\
     *   [eq3]
     * \end{aligned}
     * \right.
     * \end{equation}
     */
    let latexCode;

    if (equations.length === 1) {
      // Single equation - matches backend Block.kt lines 49-56
      latexCode = `\\begin{equation}\\begin{aligned}${equations[0]}\\end{aligned}\\end{equation}`;
    } else {
      // Multiple equations (system) - matches backend LatexUtils.kt createSystemOfEquations
      latexCode = `\\begin{equation}\\left\\{\\begin{aligned}${equations.join(' \\\\\\\\ ')}\\end{aligned}\\right.\\end{equation}`;
    }

    try {
      KaTeX.render(latexCode, this.output, KATEX_DISPLAY_OPTIONS);
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

  /**
   * Saves equation data
   *
   * Returns the current block data for saving.
   * Empty equations are allowed (user may be starting fresh or clearing content).
   */
  save(blockContent) {
    return {
      ...this.data,
    };
  }
}

export default LatexTool;
