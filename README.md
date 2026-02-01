# Alfabeto Modular

Aplicación web experimental para la visualización de texto mediante un sistema de alfabeto modular abstracto.

## 📖 Descripción

Esta aplicación traduce texto alfanumérico en una representación visual geométrica. Cada carácter es sustituido por un patrón único de puntos distribuidos en una cuadrícula de 3x3 (excluyendo el centro exacto), creando un lenguaje visual minimalista y moderno.

El proyecto está construido utilizando **p5.js**, una biblioteca de JavaScript para la codificación creativa.

## 🚀 Funcionalidades

- **Traducción en Tiempo Real:** Convierte cualquier texto introducido por el usuario en su representación modular al instante.
- **Sistema de Codificación Binaria:** 
  - Cada letra del alfabeto (A-Z) se asigna a un número secuencial (A=1, B=2, etc.).
  - La letra 'Ñ' tiene su propio valor (27).
  - Los números (0-9) y signos de puntuación básicos también tienen asignaciones únicas.
  - Este valor numérico se convierte a un binario de 8 bits.
  - Cada bit activa o desactiva uno de los 8 puntos posibles en la celda del carácter.
- **Interfaz Interactiva:**
  - Campo de texto para introducir frases personalizadas.
  - Botón "GENERAR" para procesar el texto.
  - Botón "GUARDAR" para descargar la composición actual como una imagen PNG.
- **Diseño Responsivo:** El lienzo se ajusta automáticamente al tamaño de la pantalla, recalculando la distribución de las letras para asegurar que todo el mensaje sea visible.
- **Interactividad Visual:**
  - Animación de entrada (fade-in) para cada carácter.
  - Efecto "Hover": Al pasar el ratón sobre un símbolo modular, se revela el carácter original que representa.

## 🛠 Tecnologías Utilizadas

- **HTML5 & CSS3:** Estructura y estilos de la interfaz de usuario, con un diseño limpio y tipografía moderna (Inter).
- **JavaScript (ES6):** Lógica de la aplicación.
- **p5.js:** Renderizado de gráficos en el elemento `<canvas>`, manejo de vectores y eventos de dibujo.

## 📂 Origen

Este proyecto es un experimento de codificación creativa desarrollado por **Manuel Cañas Vidaller**. Explora la relación entre los datos (texto), los sistemas numéricos y la representación visual.

## 📦 Instalación y Uso

No requiere instalación de dependencias ni servidores complejos (es una aplicación estática del lado del cliente).

1. Clona este repositorio o descarga los archivos.
2. Abre el archivo `index.html` en tu navegador web moderno preferido.
3. ¡Escribe y experimenta!
