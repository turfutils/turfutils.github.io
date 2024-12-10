// Function to replace strings in all <a> tags' href attributes
function replaceInLinks(findStr, replaceStr) {
    document.querySelectorAll('a[href]').forEach(link => {
        // Update the href attribute
        link.href = link.href.replace(findStr, replaceStr);
    });
}
