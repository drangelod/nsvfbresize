import Vue from 'nativescript-vue'
import VueDevtools from 'nativescript-vue-devtools'
import firebase from "nativescript-plugin-firebase"  
import BackendService from './services/BackendService' 
import AuthService from './services/AuthService' 
import LoginPage from './components/LoginPage'

//shared among components
export const backendService = new BackendService()
export const authService = new AuthService()
import store from './store';

Vue.prototype.$authService = authService
Vue.prototype.$backendService = backendService
Vue.prototype.$store = store;

if(TNS_ENV !== 'production') {
  Vue.use(VueDevtools)
}
Vue.config.silent = (TNS_ENV === 'production')
//Vue.config.silent = true

new Vue({
  store, 
  render: h => h('frame', [h(LoginPage)])
}).$start()