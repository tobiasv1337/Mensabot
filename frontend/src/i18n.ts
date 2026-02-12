import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/translation.json";
import de from "./locales/de/translation.json";

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
    en: {
        translation: en
    },
    de: {
        translation: de
    }
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: "de", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
        // if you're using a language detector, do not define the lng option

        interpolation: {
            escapeValue: false // react already saves from xss
        }
    });

export default i18n;
