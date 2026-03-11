Here you can edit your decision table. It consist of columns (that describes fields that is required to make a API request to this table) and rows (set of rules, that applied specified order).

There are two main table types: **Decision** and **Scoring**.

**Decision table** applies rules one by one until one rule passes, then returns the value in the Decision column for that rule. If no rule passes, the value in the "Default" section is returned.

**Scoring tables** evaluate all rules and aggregate the Score column values. There are four scoring subtypes:

- **Sum** (`scoring_sum`): returns the sum of all matched scores.
- **Min** (`scoring_min`): returns the minimum score among all matched rules.
- **Max** (`scoring_max`): returns the maximum score among all matched rules.
- **Count** (`scoring_count`): returns the count of matched rules (no score value needed per rule).

More info you can find in our [documentation](http://docs.gndf.io/).
