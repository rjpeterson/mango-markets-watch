import Alpine from 'alpinejs'
import collapse from '@alpinejs/collapse'
import focus from '@alpinejs/focus'
 
Alpine.plugin(focus) 
Alpine.plugin(collapse)
window.Alpine = Alpine

Alpine.start()