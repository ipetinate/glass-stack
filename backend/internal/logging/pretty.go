package logging

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"sync"
	"time"
)

type prettyHandler struct {
	mu    *sync.Mutex
	out   io.Writer
	level slog.Level
	attrs []slog.Attr
	group string
}

func newPrettyHandler(out io.Writer, options *slog.HandlerOptions) slog.Handler {
	level := slog.LevelInfo
	if options != nil && options.Level != nil {
		level = options.Level.Level()
	}
	return &prettyHandler{
		mu:    &sync.Mutex{},
		out:   out,
		level: level,
	}
}

func (handler *prettyHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= handler.level
}

func (handler *prettyHandler) Handle(_ context.Context, record slog.Record) error {
	var output strings.Builder
	output.WriteString("[")
	output.WriteString(record.Time.Local().Format("15:04:05"))
	output.WriteString("] ")
	output.WriteString(levelIcon(record.Level))
	output.WriteString(" ")
	output.WriteString(record.Message)

	attrs := append([]slog.Attr(nil), handler.attrs...)
	record.Attrs(func(attribute slog.Attr) bool {
		attrs = append(attrs, attribute)
		return true
	})
	for _, attribute := range attrs {
		writeAttribute(&output, handler.group, attribute)
	}
	output.WriteString("\n\n")

	handler.mu.Lock()
	defer handler.mu.Unlock()
	_, err := io.WriteString(handler.out, output.String())
	return err
}

func (handler *prettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	clone := handler.clone()
	clone.attrs = append(clone.attrs, attrs...)
	return clone
}

func (handler *prettyHandler) WithGroup(name string) slog.Handler {
	clone := handler.clone()
	if name == "" {
		return clone
	}
	if clone.group == "" {
		clone.group = name
	} else {
		clone.group += "." + name
	}
	return clone
}

func (handler *prettyHandler) clone() *prettyHandler {
	return &prettyHandler{
		mu:    handler.mu,
		out:   handler.out,
		level: handler.level,
		attrs: append([]slog.Attr(nil), handler.attrs...),
		group: handler.group,
	}
}

func writeAttribute(output *strings.Builder, group string, attribute slog.Attr) {
	attribute.Value = attribute.Value.Resolve()
	if attribute.Equal(slog.Attr{}) {
		return
	}
	if attribute.Value.Kind() == slog.KindGroup {
		for _, child := range attribute.Value.Group() {
			writeAttribute(output, joinGroup(group, attribute.Key), child)
		}
		return
	}
	key := joinGroup(group, attribute.Key)
	if key == "" {
		return
	}
	value := strings.ReplaceAll(formatValue(attribute.Value), "\n", "\\n")
	output.WriteString("\n  ")
	output.WriteString(key)
	output.WriteString(": ")
	output.WriteString(value)
}

func joinGroup(group, key string) string {
	if group == "" {
		return key
	}
	if key == "" {
		return group
	}
	return group + "." + key
}

func formatValue(value slog.Value) string {
	switch value.Kind() {
	case slog.KindString:
		return value.String()
	case slog.KindTime:
		return value.Time().Format(time.RFC3339Nano)
	default:
		return fmt.Sprint(value.Any())
	}
}

func levelIcon(level slog.Level) string {
	switch {
	case level >= slog.LevelError:
		return "🛑 ERROR"
	case level >= slog.LevelWarn:
		return "⚠️ WARN"
	case level >= slog.LevelInfo:
		return "ℹ️ INFO"
	default:
		return "🔹 DEBUG"
	}
}
