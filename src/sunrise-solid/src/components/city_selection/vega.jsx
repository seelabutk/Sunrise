
export const sunVegaSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'A simple bar chart with embedded data.',
    data: {
        "sequence": {
          "start": 0,
          "stop": 24,
          "step": 0.25,
          "as": "x"
        }
    },
    transform: [
        {
            calculate: "sin(datum.x)",
            as: "sin(x)",
        },
        {
            calculate: "cos(datum.x)",
            as: "cos(x)",
        },
    ],
    width: 'container',
    height: 'container',
    mark: 'line',
    encoding: {
        x: {field: 'x', type: 'quantitative', axis: null},
        y: {field: 'sin(x)', type: 'quantitative', axis: null}
    }
};
