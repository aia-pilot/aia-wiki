// export { default } from '@vben/tailwind-config';
import {default as config, tailwindPackages} from '@vben/tailwind-config'

const fixTailwindIDEAPluginDoesNotWork = () => {
  setTimeout(() => {
    console.log('------ tailwindPackages', tailwindPackages);
  }, 10000)
  config.content?.push('./public/**/*.html', './src/**/*.{vue,js,ts,jsx,tsx}', "node_modules/flowbite-vue/**/*.{js,jsx,ts,tsx}");
}

fixTailwindIDEAPluginDoesNotWork();

export {config as default}
