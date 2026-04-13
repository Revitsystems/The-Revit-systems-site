import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window as any);

export const sanitize = (text: string): string => {
  return DOMPurify.sanitize(text);
};
