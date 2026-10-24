// Package frontendstatic serves resolved frontend files without URL redirects.
package frontendstatic

import (
	"net/http"
	"os"
)

// ServeContent serves a regular file at its requested URL, including index.html.
// Unlike http.ServeFile, it does not redirect index.html to a directory URL.
func ServeContent(w http.ResponseWriter, r *http.Request, filePath string) {
	file, err := os.Open(filePath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}
