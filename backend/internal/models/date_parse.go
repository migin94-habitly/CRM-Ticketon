package models

import (
	"fmt"
	"strings"
	"time"
)

func ParseCloseDate(s *string) (*time.Time, error) {
	if s == nil {
		return nil, nil
	}
	raw := strings.TrimSpace(*s)
	if raw == "" {
		return nil, nil
	}
	if t, err := time.ParseInLocation("2006-01-02", raw, time.UTC); err == nil {
		return &t, nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return &t, nil
	}
	return nil, fmt.Errorf("invalid close_date: use YYYY-MM-DD or RFC3339")
}

func NilIfEmptyUUIDPtr(s *string) *string {
	if s == nil {
		return nil
	}
	if strings.TrimSpace(*s) == "" {
		return nil
	}
	return s
}
