# Alfabeto Modular 💠

> Un sistema visual interactivo que transforma texto en geometría modular tridimensional basada en codificación binaria posicional.

[![Made with p5.js](https://img.shields.io/badge/Made%20with-p5.js-ED225D?style=flat-square&logo=p5.js)](https://p5js.org/)
[![Pure JavaScript](https://img.shields.io/badge/Pure-JavaScript-F7DF1E?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Mobile Optimized](https://img.shields.io/badge/Mobile-Optimized-00C853?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

## 🎯 Concepto

Cada carácter del alfabeto, número y símbolo se representa como una configuración única de 8 puntos en un cubo tridimensional. La posición de cada carácter en el alfabeto determina qué puntos se activan mediante codificación binaria, creando patrones geométricos distintivos y memorables.

## ✨ Características

### 🏠 **Modo Inicio**
Exploración visual inmersiva con:
- **Nube de módulos 3D** flotante y reactiva
- **Sistema cromático** por ramas del alfabeto (7 grupos de color)
- **Leyenda interactiva** con previsualización en tiempo real
- **Controles táctiles avanzados**: Rotación con 1 dedo, zoom con 2 dedos (threshold inteligente)

### ⚙️ **Generador**
Traductor instantáneo de texto a geometría:
- Conversión en tiempo real de cualquier frase
- Soporte completo: A-Z, Ñ, 0-9, signos de puntuación
- Exportación de imágenes PNG
- Temas claro/oscuro optimizados

### 🎮 **Juego 3D**
Aprende el sistema jugando:
- Entorno tridimensional interactivo
- Sistema de puntuación progresivo
- Retroalimentación visual instantánea
- Desafíos crecientes de dificultad

## 🎨 Diseño & UX

### Controles Táctiles Personalizados
- **1 dedo**: Rotación de cámara inmediata (sin activación previa)
- **2 dedos**: Zoom con pinch (threshold de 15px para prevenir falsos positivos)
- **Desktop**: Click + arrastrar para rotar, rueda para zoom
- **Sistema custom**: Reemplaza orbitControl() de p5.js para control total

### Temas Optimizados
- **Modo Oscuro**: Deep Void Blue (#0B0C15) Professional & Cinematic
- **Modo Claro**: Crisp Alabaster (#F9F9FB) Clean & Modern
- **Meta theme-color**: Color dinámico de barra del navegador móvil

### Responsive por Defecto
- Diseño adaptativo completo (móvil, tablet, desktop)
- Touch-action optimizado para gestos nativos
- Tipografía Inter con legibilidad excepcional
- Glassmorphism effect en UI

## 🛠 Tecnologías

### Core
- **HTML5 + CSS3**: Layout con Grid/Flexbox, CSS Variables para theming
- **JavaScript ES6+**: POO modular, sin dependencias externas
- **p5.js 1.6.0**: Motor de renderizado 2D/3D

### Arquitectura
```
ModularAlphabet/
├── index.html          # Punto de entrada
├── css/
│   └── style.css       # Theming con CSS Variables
└── js/
    ├── app.js          # Estado global, navegación
    └── modes/
        ├── shared.js   # Utilidades centralizadas (color, geometría)
        ├── home.js     # Modo exploración 3D
        ├── generator.js # Traductor de texto
        └── game.js     # Modo juego interactivo
```

### Características Técnicas
- **Custom Camera System**: Rotación esférica manual (sin orbitControl)
- **State Management**: Sistema global con sincronización automática
- **Pixel Density**: Optimización pixelDensity(1) para rendimiento
- **Memory Safe**: Cleanup automático de instancias p5.js
- **DRY Utilities**: Helpers centralizados en `shared.js` para color y geometría del cubo.
- **Master Audit (v1.1)**: Sistema saneado de deuda técnica y redundancias visuales.

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/ModularAlphabet.git

# Abrir en navegador
open index.html
```

**No requiere build ni dependencias.** Es una aplicación web estática lista para usar.

## 📱 Compatibilidad

- ✅ Chrome/Edge (Recomendado)
- ✅ Firefox
- ✅ Safari (iOS/macOS)
- ✅ Navegadores móviles modernos

## 🎓 Sistema de Codificación

Cada carácter se mapea a un valor numérico:
- **A-Z**: Posición alfabética (1-26)
- **Ñ**: Valor 27
- **0-9**: Valores 28-37
- **Símbolos** (.,?!-): Valores 38-42

Este valor se convierte en binario de 8 bits, donde cada bit activo representa uno de los 8 vértices del cubo modular.

**Ejemplo**: `A` = 1 → `00000001` → Solo el punto 0 activo

## 🎨 Paleta Cromática

7 grupos de color con interpolación HSB:
1. **Números (0-9)**: Rosa vibrante → Magenta
2. **A-F**: Rosa profundo → Coral
3. **G-L**: Oro cálido → Ámbar
4. **M-R**: Verde primavera → Turquesa
5. **S-X**: Azul cielo → Azure profundo
6. **Y-Ñ**: Índigo → Violeta eléctrico
7. **Símbolos**: Gris neutral (baja saturación)

## 👨‍💻 Autor

**Manuel Cañas Vidaller**  
*Proyecto Experimental de Codificación Creativa*

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso educativo y experimental.

---

### 💎 **Codebase Audit & Optimization (Master Pass)**
- **Refactorización de Lógica**: Eliminación de redundancias en JS y CSS.
- **Detección Dinámica**: Mejorado el escalado de módulos 3D en dispositivos móviles.
- **Sincronización de Temas**: Unificación total de variables CSS y estado global JS.
- **Clean Architecture**: Eliminación de absoluta dependencia de `!important` a favor de una cascada limpia.

---

**⚡ Production Ready** | **🎯 0 Technical Debt** | **📱 Mobile First** | **🎨 Responsive Design**
