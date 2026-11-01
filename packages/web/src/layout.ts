// Русская раскладка ЙЦУКЕН -> клавиши QWERTY: «здуг» превращается в «pudg».
const RU = "йцукенгшщзхъфывапролджэячсмитьбю";
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";

export function fixLayout(q: string): string {
  let out = "";
  for (const ch of q) {
    const i = RU.indexOf(ch.toLowerCase());
    out += i >= 0 ? EN.charAt(i) : ch;
  }
  return out;
}