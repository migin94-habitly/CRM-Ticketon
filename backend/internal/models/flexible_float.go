package models

import (
	"encoding/json"
	"strconv"
	"strings"
)

type FlexibleFloat64 float64

func (f *FlexibleFloat64) UnmarshalJSON(b []byte) error {
	s := strings.TrimSpace(string(b))
	if s == "" || s == "null" {
		*f = 0
		return nil
	}
	if len(s) > 0 && s[0] == '"' {
		var str string
		if err := json.Unmarshal(b, &str); err != nil {
			return err
		}
		str = strings.TrimSpace(str)
		if str == "" {
			*f = 0
			return nil
		}
		v, err := strconv.ParseFloat(str, 64)
		if err != nil {
			return err
		}
		*f = FlexibleFloat64(v)
		return nil
	}
	var v float64
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	*f = FlexibleFloat64(v)
	return nil
}
