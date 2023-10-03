// <plugin root>/src/Resources/app/storefront/src/main.js
// Import all necessary Storefront plugins
import DefaultImage from './default-image/default-image.plugin';

// Register your plugin via the existing PluginManager
const PluginManager = window.PluginManager;
PluginManager.register('DefaultImage', DefaultImage, 'img');
