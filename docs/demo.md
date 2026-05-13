# The Analogy Side by Side

In GraphQL, you write this:

```graphql
query GetIssue {
  issue(id: "123") {
    id
    title
    assignee {
      id
      name
    }
    createdAt
  }
}
```

You declared the source, the fields you want, and how they come back — all in one place. The GraphQL engine handles fetching and shaping.

In our system, you write this in the API YAML:

```yaml
tasks:
  list:
    method: GET
    path: /folders/{projectKey}/tasks
    response:
      fields:
        id: { from: id }
        title: { from: title }
        assignee: { from: responsibleIds }
        createdAt: { from: createdDate }
```

Same idea. You declared the source, the fields you want, and how they map from the raw platform names to your canonical names — all in one place. The generator handles the fetching and shaping code.
