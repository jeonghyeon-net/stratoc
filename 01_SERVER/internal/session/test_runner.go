package session

import "context"

type fakeRunner struct {
	calls []runnerCall
	queue []runnerResult
}

type runnerCall struct {
	name string
	args []string
}

type runnerResult struct {
	output []byte
	err    error
}

func (runner *fakeRunner) Output(_ context.Context, name string, args ...string) ([]byte, error) {
	runner.calls = append(runner.calls, runnerCall{name: name, args: append([]string(nil), args...)})
	if len(runner.queue) == 0 {
		return nil, nil
	}
	result := runner.queue[0]
	runner.queue = runner.queue[1:]
	return result.output, result.err
}
