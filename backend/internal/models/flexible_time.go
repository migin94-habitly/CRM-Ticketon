package models

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type FlexibleTime struct {
	t *time.Time
}

func (ft *FlexibleTime) Ptr() *time.Time {
	if ft == nil {
		return nil
	}
	return ft.t
}

func (ft *FlexibleTime) UnmarshalJSON(data []byte) error {
	if ft == nil {
		return fmt.Errorf("FlexibleTime: UnmarshalJSON on nil pointer")
	}
	s := strings.TrimSpace(strings.Trim(string(data), `"`))
	if s == "" || s == "null" {
		ft.t = nil
		return nil
	}
	layouts := []struct {
		layout string
		local  bool
	}{
		{time.RFC3339, false},
		{time.RFC3339Nano, false},
		{"2006-01-02T15:04:05", true},
		{"2006-01-02T15:04", true},
	}
	for _, item := range layouts {
		var parsed time.Time
		var err error
		if item.local {
			parsed, err = time.ParseInLocation(item.layout, s, time.Local)
		} else {
			parsed, err = time.Parse(item.layout, s)
		}
		if err == nil {
			ft.t = &parsed
			return nil
		}
	}
	return fmt.Errorf("invalid datetime %q", s)
}

func (ft *FlexibleTime) MarshalJSON() ([]byte, error) {
	if ft == nil || ft.t == nil {
		return []byte("null"), nil
	}
	return json.Marshal(ft.t.Format(time.RFC3339Nano))
}
