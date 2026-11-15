import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorScreen from './ErrorScreen';
import { Button } from './ui/button';

interface State {
  error: Error | null;
}

/** Lazy pages fail to load when a new deploy replaced the old files. */
const isChunkLoadError = (error: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  );

/** Catches render crashes anywhere below it and shows a recoverable error page. */
class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('FlavorCraft crashed', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (isChunkLoadError(error)) {
      return (
        <ErrorScreen
          title="FlavorCraft was updated"
          body="A newer version was released while this tab was open. Reload to get it; your saved recipes and remixes are safe."
          shape={[5, 5, 5, 5, 5, 5, 5, 5]}
          actions={<Button size="lg" onClick={() => window.location.reload()}>Reload the page</Button>}
        />
      );
    }

    return (
      <ErrorScreen
        title="Something burned"
        body="This page hit an error and couldn't finish loading. Reloading usually fixes it. Your saved recipes, remixes and cooking log are safe."
        shape={[1, 0.5, 0.5, 9, 1, 6, 0.5, 2]}
        detail={error.message}
        actions={
          <>
            <Button size="lg" onClick={() => window.location.reload()}>Reload the page</Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/">Go to the home page</a>
            </Button>
          </>
        }
      />
    );
  }
}

export default ErrorBoundary;
