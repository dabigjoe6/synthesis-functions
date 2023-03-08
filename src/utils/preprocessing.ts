/**
 *  This function strips HTML tags from a string
 *  @param {string} str - The string to strip HTML tags from
 *  @returns {string} The string with HTML tags stripped
 */
export const stripHTMLTags = (str: string) => {
  const tagsToFilter = ["pre", "code", "img", "picture"];

  let text = str.replace(/<[^>]*>?/gm, (match) => {
    if (!tagsToFilter.some((tag) => match.includes(tag))) {
      return "";
    } else if (match.includes("/")) {
      return "[END]";
    } else {
      return "[START]";
    }
  });

  text = text.replace(/\[START\]((.|\n)*?)\[END\]/gm, (match) => {
    return "[ESCAPED]";
  });

  return text.replace(/\[END\]|\[ESCAPED\]/gm, " ");
};

/**
 * This function removes all white space from a string
 * @param {string} str - The string to remove white space from
 * @returns {string} The string with white space removed
 */
export const removeWhiteSpace = (str: string) => {
  const text = str.replace(/\s+/gm, " ").split(" ");
  return text.join(" ").trim();
};

/**
 * This function cleans HTML content by removing HTML tags and white space
 * @param {string} str - The string to clean
 * @returns {string} The cleaned string
 */
export const cleanHTMLContent = (str: string) => {
  // NOTE: This could be extended to handle all cleaning necessary as required.

  let content = "";

  // strip tags
  content = stripHTMLTags(str);

  // remove white space
  content = removeWhiteSpace(content);

  return content;
};
