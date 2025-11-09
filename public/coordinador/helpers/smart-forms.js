// public/coordinador/helpers/smart-forms.js
// Sistema de Formularios Inteligentes para el Coordinador

// Base de datos de sugerencias basadas en estándares TecNM/ABET
const KNOWLEDGE_BASE = {
  // Plantillas de Atributos por Carrera
  atributos: {
    ISC: [
      {
        id: 1,
        nombre: "Identificar, formular y resolver problemas complejos de ingeniería aplicando los principios de las ciencias básicas y ciencias computacionales",
        nombreCorto: "Resuelve problemas de Ingeniería",
        keywords: ["problema", "ingeniería", "ciencias básicas", "computacional"],
        criteriosSugeridos: [
          "Comprende problemas de ingeniería",
          "Realiza análisis crítico", 
          "Encuentra solución"
        ]
      },
      {
        id: 2,
        nombre: "Aplicar diversas técnicas de análisis y diseño para crear soluciones de Software que satisfagan necesidades",
        nombreCorto: "Análisis y diseño de Software",
        keywords: ["análisis", "diseño", "software", "soluciones"],
        criteriosSugeridos: [
          "Aplica técnicas de análisis",
          "Diseña soluciones efectivas",
          "Evalúa alternativas de diseño"
        ]
      },
      {
        id: 4,
        nombre: "Comunicarse de manera efectiva en foros y con audiencias multidisciplinarias",
        nombreCorto: "Comunicación Efectiva",
        keywords: ["comunicación", "efectiva", "audiencias", "multidisciplinaria"],
        criteriosSugeridos: [
          "Organiza la información",
          "Utiliza recursos gráficos",
          "Utiliza normas gramaticales"
        ]
      },
      {
        id: 5,
        nombre: "Reconocer sus responsabilidades éticas y profesionales en situaciones relevantes para la ingeniería",
        nombreCorto: "Ética",
        keywords: ["ética", "responsabilidades", "profesionales"],
        criteriosSugeridos: [
          "Conoce y aplica el código de ética del TecNM",
          "Capaz de evaluar dimensiones éticas"
        ]
      }
    ],
    IQ: [
      {
        id: 1,
        nombre: "Comprende los procesos fisicoquímicos naturales desde sus fundamentos básicos",
        nombreCorto: "Procesos Fisicoquímicos",
        keywords: ["fisicoquímico", "procesos", "fundamentos"],
        criteriosSugeridos: [
          "Identifica procesos naturales",
          "Aplica fundamentos teóricos",
          "Analiza transformaciones"
        ]
      }
    ]
  },

  // Plantillas de Criterios con niveles Likert predefinidos
  criterios: {
    comunicacion: {
      "Organiza la información": {
        nivel1: "No organiza la información de manera coherente",
        nivel2: "Organiza información básica con estructura simple", 
        nivel3: "Organiza información de manera clara y lógica",
        nivel4: "Organiza información de manera excepcional con estructura compleja"
      },
      "Utiliza recursos gráficos": {
        nivel1: "No utiliza recursos gráficos apropiados",
        nivel2: "Utiliza recursos gráficos básicos",
        nivel3: "Utiliza recursos gráficos efectivos",
        nivel4: "Utiliza recursos gráficos de manera innovadora y profesional"
      },
      "Presenta ideas claramente": {
        nivel1: "Ideas confusas y desorganizadas",
        nivel2: "Ideas básicas con claridad limitada",
        nivel3: "Ideas claras y bien estructuradas", 
        nivel4: "Ideas excepcionalmente claras y persuasivas"
      }
    },
    etica: {
      "Conoce código de ética": {
        nivel1: "No demuestra conocimiento del código ético",
        nivel2: "Conocimiento básico del código ético",
        nivel3: "Buen conocimiento y aplicación del código ético",
        nivel4: "Conocimiento profundo y aplicación ejemplar del código ético"
      },
      "Evalúa dimensiones éticas": {
        nivel1: "No identifica aspectos éticos",
        nivel2: "Identifica aspectos éticos básicos",
        nivel3: "Evalúa aspectos éticos de manera competente",
        nivel4: "Evaluación ética profunda y reflexiva"
      }
    },
    solucionProblemas: {
      "Comprende problemas": {
        nivel1: "No comprende la naturaleza del problema",
        nivel2: "Comprensión básica del problema",
        nivel3: "Comprende el problema y sus implicaciones",
        nivel4: "Comprensión profunda y análisis exhaustivo del problema"
      },
      "Aplica metodologías": {
        nivel1: "No aplica metodologías apropiadas",
        nivel2: "Aplica metodologías básicas",
        nivel3: "Aplica metodologías de manera competente",
        nivel4: "Aplica metodologías de manera innovadora y efectiva"
      }
    }
  },

  // Patrones de validación
  validation: {
    atributo: {
      minLength: 20,
      maxLength: 200,
      patterns: [
        /^(Identificar|Aplicar|Desarrollar|Comunicar|Reconocer|Dirigir)/i,
        /ingeniería|software|sistemas|computacional/i
      ]
    },
    criterio: {
      minLength: 10,
      maxLength: 100,
      patterns: [
        /^(Comprende|Realiza|Encuentra|Organiza|Utiliza|Conoce|Evalúa|Aplica)/i
      ]
    }
  }
};

// Clase principal del sistema de formularios inteligentes
export class SmartFormSystem {
  constructor() {
    this.activeForm = null;
    this.suggestions = [];
    this.currentCareer = 'ISC'; // Por defecto
  }

  // Inicializar sistema en un formulario específico
  initializeForm(formElement, formType, career = 'ISC') {
    this.activeForm = formElement;
    this.currentCareer = career;
    
    // Agregar event listeners a todos los inputs
    const inputs = formElement.querySelectorAll('input[type="text"], textarea');
    inputs.forEach(input => {
      this.enhanceInput(input, formType);
    });

    // Agregar validación en tiempo real
    formElement.addEventListener('submit', (e) => {
      if (!this.validateForm(formType)) {
        e.preventDefault();
      }
    });
  }

  // Mejorar un input individual
  enhanceInput(input, formType) {
    // Crear contenedor para sugerencias
    const container = this.createSuggestionContainer(input);
    
    // Event listeners
    input.addEventListener('input', (e) => {
      this.handleInputChange(e, formType, container);
    });
    
    input.addEventListener('focus', (e) => {
      this.handleInputFocus(e, formType, container);
    });
    
    input.addEventListener('blur', (e) => {
      // Pequeño delay para permitir clicks en sugerencias
      setTimeout(() => {
        this.hideSuggestions(container);
      }, 200);
    });
  }

  // Crear contenedor de sugerencias
  createSuggestionContainer(input) {
    const container = document.createElement('div');
    container.className = 'smart-suggestions';
    container.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #d1d5db;
      border-top: none;
      border-radius: 0 0 8px 8px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: none;
    `;

    // Hacer el parent relative si no lo es
    const parent = input.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    
    parent.appendChild(container);
    return container;
  }

  // Manejar cambios en input
  handleInputChange(event, formType, container) {
    const input = event.target;
    const value = input.value.toLowerCase();
    const fieldName = this.getFieldName(input);
    
    if (value.length < 2) {
      this.hideSuggestions(container);
      return;
    }

    const suggestions = this.getSuggestions(value, formType, fieldName);
    this.showSuggestions(suggestions, container, input);
    
    // Validación en tiempo real
    this.validateField(input, formType, fieldName);
  }

  // Manejar focus en input
  handleInputFocus(event, formType, container) {
    const input = event.target;
    const fieldName = this.getFieldName(input);
    
    // Mostrar plantillas relevantes al hacer focus
    const templates = this.getTemplates(formType, fieldName);
    if (templates.length > 0) {
      this.showSuggestions(templates, container, input, true);
    }
  }

  // Obtener sugerencias basadas en input
  getSuggestions(value, formType, fieldName) {
    let suggestions = [];

    if (formType === 'atributo') {
      // Buscar atributos similares
      const atributos = KNOWLEDGE_BASE.atributos[this.currentCareer] || [];
      suggestions = atributos.filter(attr => 
        attr.keywords.some(keyword => keyword.includes(value)) ||
        attr.nombre.toLowerCase().includes(value) ||
        attr.nombreCorto.toLowerCase().includes(value)
      ).map(attr => ({
        text: fieldName === 'nombreCorto' ? attr.nombreCorto : attr.nombre,
        type: 'template',
        metadata: attr
      }));
    }

    if (formType === 'criterio') {
      // Buscar criterios por categoría
      const categorias = Object.keys(KNOWLEDGE_BASE.criterios);
      categorias.forEach(categoria => {
        const criterios = KNOWLEDGE_BASE.criterios[categoria];
        Object.keys(criterios).forEach(criterio => {
          if (criterio.toLowerCase().includes(value)) {
            suggestions.push({
              text: criterio,
              type: 'template',
              category: categoria,
              levels: criterios[criterio]
            });
          }
        });
      });
    }

    // Limitar sugerencias
    return suggestions.slice(0, 6);
  }

  // Obtener plantillas para un campo específico
  getTemplates(formType, fieldName) {
    let templates = [];

    if (formType === 'atributo' && fieldName === 'nombre') {
      const atributos = KNOWLEDGE_BASE.atributos[this.currentCareer] || [];
      templates = atributos.map(attr => ({
        text: attr.nombre,
        type: 'template',
        icon: '📋',
        metadata: attr
      }));
    }

    if (formType === 'criterio' && fieldName === 'descripcion') {
      const categorias = ['comunicacion', 'etica', 'solucionProblemas'];
      categorias.forEach(categoria => {
        const criterios = Object.keys(KNOWLEDGE_BASE.criterios[categoria]);
        criterios.forEach(criterio => {
          templates.push({
            text: criterio,
            type: 'template',
            icon: '🎯',
            category: categoria,
            levels: KNOWLEDGE_BASE.criterios[categoria][criterio]
          });
        });
      });
    }

    return templates.slice(0, 5);
  }

  // Mostrar sugerencias
  showSuggestions(suggestions, container, input, isTemplate = false) {
    if (suggestions.length === 0) {
      this.hideSuggestions(container);
      return;
    }

    const html = suggestions.map((suggestion, index) => `
      <div class="suggestion-item" data-index="${index}" style="
        padding: 0.75rem;
        cursor: pointer;
        border-bottom: 1px solid #f1f5f9;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      ">
        ${suggestion.icon ? `<span>${suggestion.icon}</span>` : ''}
        <div style="flex: 1;">
          <div style="font-weight: 500; color: #374151;">${this.highlightMatch(suggestion.text, input.value)}</div>
          ${suggestion.category ? `<div style="font-size: 0.75rem; color: #6b7280;">Categoría: ${suggestion.category}</div>` : ''}
          ${isTemplate ? `<div style="font-size: 0.75rem; color: #16a34a;">Plantilla TecNM</div>` : ''}
        </div>
        ${suggestion.type === 'template' ? '<span style="color: #16a34a;">⭐</span>' : ''}
      </div>
    `).join('');

    container.innerHTML = html;
    container.style.display = 'block';

    // Event listeners para clicks
    container.querySelectorAll('.suggestion-item').forEach((item, index) => {
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f8fafc';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });
      
      item.addEventListener('click', () => {
        this.applySuggestion(suggestions[index], input);
        this.hideSuggestions(container);
      });
    });
  }

  // Aplicar sugerencia seleccionada
  applySuggestion(suggestion, input) {
    input.value = suggestion.text;
    
    // Si es una plantilla con metadata adicional, llenar otros campos
    if (suggestion.metadata || suggestion.levels) {
      this.fillRelatedFields(suggestion, input);
    }
    
    // Trigger change event
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Mostrar mensaje de éxito
    this.showSuccessMessage(input, 'Plantilla aplicada correctamente');
  }

  // Llenar campos relacionados automáticamente
  fillRelatedFields(suggestion, currentInput) {
    const form = currentInput.closest('form');
    if (!form) return;

    // Para atributos
    if (suggestion.metadata) {
      const nombreCortoInput = form.querySelector('[name="nomcorto"], [id*="nombreCorto"], [id*="short"]');
      if (nombreCortoInput && !nombreCortoInput.value) {
        nombreCortoInput.value = suggestion.metadata.nombreCorto;
        this.showSuccessMessage(nombreCortoInput, 'Nombre corto agregado automáticamente');
      }
    }

    // Para criterios con niveles
    if (suggestion.levels) {
      const nivelInputs = {
        nivel1: form.querySelector('[name="des_n1"], [id*="nivel-1"], [id*="n1"]'),
        nivel2: form.querySelector('[name="des_n2"], [id*="nivel-2"], [id*="n2"]'),
        nivel3: form.querySelector('[name="des_n3"], [id*="nivel-3"], [id*="n3"]'),
        nivel4: form.querySelector('[name="des_n4"], [id*="nivel-4"], [id*="n4"]')
      };

      Object.keys(nivelInputs).forEach(nivel => {
        const input = nivelInputs[nivel];
        if (input && !input.value && suggestion.levels[nivel]) {
          input.value = suggestion.levels[nivel];
          this.showSuccessMessage(input, `Nivel ${nivel.slice(-1)} agregado`);
        }
      });
    }
  }

  // Ocultar sugerencias
  hideSuggestions(container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }

  // Resaltar coincidencias en el texto
  highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background: #fef3c7; padding: 0.1rem;">$1</mark>');
  }

  // Obtener nombre del campo
  getFieldName(input) {
    return input.name || input.id || input.getAttribute('data-field') || 'unknown';
  }

  // Validación de campo
  validateField(input, formType, fieldName) {
    const value = input.value.trim();
    const validationRules = KNOWLEDGE_BASE.validation[formType];
    
    if (!validationRules) return true;

    let isValid = true;
    let messages = [];

    // Validar longitud
    if (value.length < validationRules.minLength) {
      isValid = false;
      messages.push(`Mínimo ${validationRules.minLength} caracteres`);
    }

    if (value.length > validationRules.maxLength) {
      isValid = false;
      messages.push(`Máximo ${validationRules.maxLength} caracteres`);
    }

    // Validar patrones
    if (value.length >= validationRules.minLength) {
      const patternMatch = validationRules.patterns.some(pattern => pattern.test(value));
      if (!patternMatch) {
        messages.push('Formato recomendado: inicie con un verbo de acción');
      }
    }

    // Mostrar mensajes de validación
    this.showValidationMessage(input, messages, isValid);
    return isValid;
  }

  // Mostrar mensajes de validación
  showValidationMessage(input, messages, isValid) {
    // Limpiar mensajes anteriores
    const existingMsg = input.parentElement.querySelector('.validation-message');
    if (existingMsg) {
      existingMsg.remove();
    }

    if (messages.length === 0) return;

    const msgElement = document.createElement('div');
    msgElement.className = 'validation-message';
    msgElement.style.cssText = `
      font-size: 0.75rem;
      margin-top: 0.25rem;
      color: ${isValid ? '#16a34a' : '#ef4444'};
    `;
    msgElement.textContent = messages.join(', ');
    
    input.parentElement.appendChild(msgElement);
  }

  // Mostrar mensaje de éxito
  showSuccessMessage(input, message) {
    // Limpiar mensajes anteriores
    const existingMsg = input.parentElement.querySelector('.success-message');
    if (existingMsg) {
      existingMsg.remove();
    }

    const msgElement = document.createElement('div');
    msgElement.className = 'success-message';
    msgElement.style.cssText = `
      font-size: 0.75rem;
      margin-top: 0.25rem;
      color: #16a34a;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    msgElement.innerHTML = `✅ ${message}`;
    
    input.parentElement.appendChild(msgElement);

    // Fadeout después de 3 segundos
    setTimeout(() => {
      msgElement.style.opacity = '0';
      setTimeout(() => {
        msgElement.remove();
      }, 300);
    }, 3000);
  }

  // Validar formulario completo
  validateForm(formType) {
    if (!this.activeForm) return true;

    const inputs = this.activeForm.querySelectorAll('input[type="text"], textarea');
    let isFormValid = true;

    inputs.forEach(input => {
      const fieldName = this.getFieldName(input);
      const isFieldValid = this.validateField(input, formType, fieldName);
      if (!isFieldValid) {
        isFormValid = false;
      }
    });

    return isFormValid;
  }

  // Actualizar carrera
  setCareer(career) {
    this.currentCareer = career;
  }
}

// Instancia global del sistema
export const smartForms = new SmartFormSystem();

// Función de utilidad para inicializar formularios
export function initializeSmartForm(selector, formType, career = 'ISC') {
  const form = document.querySelector(selector);
  if (form) {
    smartForms.initializeForm(form, formType, career);
  }
}