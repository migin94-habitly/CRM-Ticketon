// Package mimetype provides MIME type detection.
package mimetype

import (
	"io"
	"os"
)

// MIME holds the mime type and extension
type MIME struct {
	mime string
	ext  string
}

func (m *MIME) String() string {
	if m == nil {
		return "application/octet-stream"
	}
	return m.mime
}

func (m *MIME) Extension() string {
	if m == nil {
		return ""
	}
	return m.ext
}

func (m *MIME) Is(expectedMIME string) bool {
	return m.String() == expectedMIME
}

// DetectReader detects the MIME type from a reader
func DetectReader(r io.Reader) (*MIME, error) {
	return &MIME{mime: "application/octet-stream", ext: ""}, nil
}

// DetectFile detects the MIME type from a file path
func DetectFile(path string) (*MIME, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return DetectReader(f)
}

// Detect detects the MIME type from bytes
func Detect(in []byte) *MIME {
	return &MIME{mime: "application/octet-stream", ext: ""}
}
