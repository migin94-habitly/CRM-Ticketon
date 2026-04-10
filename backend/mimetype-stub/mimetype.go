package mimetype

import (
	"io"
	"os"
)

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

func DetectReader(r io.Reader) (*MIME, error) {
	return &MIME{mime: "application/octet-stream", ext: ""}, nil
}

func DetectFile(path string) (*MIME, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return DetectReader(f)
}

func Detect(in []byte) *MIME {
	return &MIME{mime: "application/octet-stream", ext: ""}
}
