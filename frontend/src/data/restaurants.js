export function useRestaurants({ limit = 12 } = {}) {
  // ...same state declarations as before...

  useEffect(() => {
    let active = true;

    api
      .listRestaurants({ limit })
      .then((data) => {
        if (!active) return;
        setState({
          items: (data.items || []).map(normalize),
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          items: [],
          loading: false,
          error: error.message || "Unable to load restaurants",
        });
      });

    return () => {
      active = false;
    };
  }, [limit]);

  return state;
}