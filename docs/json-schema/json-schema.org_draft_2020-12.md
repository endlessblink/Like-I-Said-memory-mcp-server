---
url: "https://json-schema.org/draft/2020-12"
title: "JSON Schema"
---

### Specification

# Draft 2020-12

Specification Details

Specification

[https://json-schema.org/draft/2020-12/json-schema-core.html](https://json-schema.org/draft/2020-12/json-schema-core.html)

Published

16 June 2022

Authors

Austin Wright, Henry Andrews, Ben Hutton, Greg Dennis

Metaschema

[https://json-schema.org/draft/2020-12/schema](https://json-schema.org/draft/2020-12/schema)

### Introduction

The JSON Schema Draft 2020-12 is a comprehensive update to the previous [draft 2019-09](https://json-schema.org/draft/draft/2019-09), addressing feedback and implementation experiences. This draft introduces features to simplify creating and validating JSON schemas.

Here's an overview of updates to Draft 2020-12;

- **Redesigned Array and Tuple Keywords**: The `items` and `additionalItems` keywords have been replaced by `prefixItems` and `items`.
- **Dynamic References**: The introduction of `$dynamicRef` and `$dynamicAnchor` replaces the older `$recursiveRef` and `$recursiveAnchor`.
- **Contains and UnevaluatedItems**: Specifies how the `contains` keyword affects the `unevaluatedItems` keyword.
- **Regular Expressions**: Now expected to support Unicode characters, addressing inconsistencies in previous drafts.
- **Media Type Changes**: Drops the schema media type parameter.
- **Embedded Schemas and Bundling**: Provides guidance on bundling schemas into a Compound Schema Document.
- **Vocabulary Changes**: Separates the `format` vocabulary into `format-annotation` and `format-assertion`.

### Draft 2020-12 Documents

- Specifications
  - Core: [draft-bhutton-json-schema-01](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-01.html) ( [changes](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-01.html#appendix-G))
  - Validation: [draft-bhutton-json-schema-validation-01](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01.html) ( [changes](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01.html#appendix-C))
  - Relative JSON Pointer: [draft-bhutton-relative-json-pointer-00](https://tools.ietf.org/html/draft-bhutton-relative-json-pointer-00) ( [changes](https://tools.ietf.org/html/draft-bhutton-relative-json-pointer-00#appendix-A))
  - Published: 16-June-2022
- General use meta-schemas
  - [JSON Schema meta-schema](https://json-schema.org/draft/2020-12/schema)
  - [JSON Hyper-Schema meta-schema](https://json-schema.org/draft/2020-12/hyper-schema) (2019-09 Hyper-Schema with 2020-12 Validation)
  - [JSON Hyper-Schema Link Description Object meta-schema](https://json-schema.org/draft/2020-12/links)
- Individual vocabulary meta-schemas
  - [Core Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/core)
  - [Applicator Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/applicator)
  - [Validation Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/validation)
  - [Unevaluated Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/unevaluated)
  - [Format Annotation Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/format-annotation)
  - [Format Assertion Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/format-assertion)
  - [Content Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/content)
  - [Meta-Data Vocabulary meta-schema](https://json-schema.org/draft/2020-12/meta/meta-data)
- Output schemas
  - [JSON Schema recommended output schema](https://json-schema.org/draft/2020-12/output/schema)
- Output examples
  - [JSON Schema verbose output example](https://json-schema.org/draft/2020-12/output/verbose-example)

#### Obsolete Draft 2020-12 Documents

_These were updated without changing functionality or meta-schemas due to a few errors and unclear sections._

- Core: [draft-bhutton-json-schema-00](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-00.html) ( [changes](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-00.html#rfc.appendix.G))
- Validation: [draft-bhutton-json-schema-validation-00](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-00.html) ( [changes](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-00.html#rfc.appendix.C))

### Release Notes

- [Draft 2020-12 Release Notes](https://json-schema.org/draft/2020-12/release-notes)

[Go Back\\
\\
Specification](https://json-schema.org/specification)

[Up Next\\
\\
Draft 2019-09](https://json-schema.org/draft/2019-09)

## Need Help?

### Did you find these docs helpful?

### Help us make our docs great!

At JSON Schema, we value docs contributions as much as every other type of contribution!

[Edit this page on Github](https://github.com/json-schema-org/website/blob/main/pages/draft/2020-12/index.md)

[Learn how to contribute](https://github.com/json-schema-org/website/blob/main/CONTRIBUTING.md)

### Still Need Help?

Learning JSON Schema is often confusing, but don't worry, we are here to help!.

[Ask the community on GitHub](https://github.com/orgs/json-schema-org/discussions/new?category=q-a)

[Ask the community on Slack](https://json-schema.org/slack)