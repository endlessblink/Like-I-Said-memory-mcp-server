---
url: "https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01"
title: "JSON Schema Validation: A Vocabulary for Structural Validation of JSON"
---

| Internet-Draft | JSON Schema Validation | June 2022 |
| --- | --- | --- |
| Wright, et al. | Expires 18 December 2022 | \[Page\] |

Workgroup:Internet Engineering Task ForceInternet-Draft:draft-bhutton-json-schema-validation-01Published:16 June 2022Intended Status:InformationalExpires:18 December 2022Authors:

A. Wright, Ed.

H. Andrews, Ed.

B. Hutton, Ed.

Postman

# JSON Schema Validation: A Vocabulary for Structural Validation of JSON

## [Abstract](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#abstract)

JSON Schema (application/schema+json) has several purposes, one of which is JSON
instance validation.
This document specifies a vocabulary for JSON Schema to describe the meaning of JSON
documents, provide hints for user interfaces working with JSON data, and to make
assertions about what a valid document must look like. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-abstract-1)

## [Note to Readers](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-note-to-readers)

The issues list for this draft can be found at
[https://github.com/json-schema-org/json-schema-spec/issues](https://github.com/json-schema-org/json-schema-spec/issues). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-note.1-1)

For additional information, see [https://json-schema.org/](https://json-schema.org/). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-note.1-2)

To provide feedback, use this issue tracker, the communication methods listed on the
homepage, or email the document editors. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-note.1-3)

## [Status of This Memo](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-status-of-this-memo)

This Internet-Draft is submitted in full conformance with the
provisions of BCP 78 and BCP 79. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-boilerplate.1-1)

Internet-Drafts are working documents of the Internet Engineering Task
Force (IETF). Note that other groups may also distribute working
documents as Internet-Drafts. The list of current Internet-Drafts is
at [https://datatracker.ietf.org/drafts/current/](https://datatracker.ietf.org/drafts/current/). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-boilerplate.1-2)

Internet-Drafts are draft documents valid for a maximum of six months
and may be updated, replaced, or obsoleted by other documents at any
time. It is inappropriate to use Internet-Drafts as reference
material or to cite them other than as "work in progress." [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-boilerplate.1-3)

This Internet-Draft will expire on 18 December 2022. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-boilerplate.1-4)

## [Copyright Notice](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-copyright-notice)

Copyright (c) 2022 IETF Trust and the persons identified as the
document authors. All rights reserved. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-boilerplate.2-1)

This document is subject to BCP 78 and the IETF Trust's Legal
Provisions Relating to IETF Documents
([https://trustee.ietf.org/license-info](https://trustee.ietf.org/license-info)) in effect on the date of
publication of this document. Please review these documents
carefully, as they describe your rights and restrictions with
respect to this document. Code Components extracted from this
document must include Revised BSD License text as described in
Section 4.e of the Trust Legal Provisions and are provided without
warranty as described in the Revised BSD License. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-boilerplate.2-2)

[▲](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#)

## [Table of Contents](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-table-of-contents)

## [1\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-1) [Introduction](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-introduction)

JSON Schema can be used to require that a given JSON document (an instance)
satisfies a certain number of criteria. These criteria are asserted by using
keywords described in this specification. In addition, a set of keywords
is also defined to assist in interactive user interface instance generation. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-1-1)

This specification will use the concepts, syntax, and terminology defined
by the [JSON Schema core](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema) \[ [json-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema)\] specification. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-1-2)

## [2\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-2) [Conventions and Terminology](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-conventions-and-terminology)



The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2119) \[ [RFC2119](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2119)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-2-1)

This specification uses the term "container instance" to refer to both array and
object instances. It uses the term "children instances" to refer to array elements
or object member values. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-2-2)

Elements in an array value are said to be unique if no two elements of this array
are [equal](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema) \[ [json-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-2-3)

## [3\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-3) [Overview](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-overview)

JSON Schema validation asserts constraints on the structure of instance data.
An instance location that satisfies all asserted constraints is then
annotated with any keywords that contain non-assertion information,
such as descriptive metadata and usage hints. If all locations within
the instance satisfy all asserted constraints, then the instance is
said to be valid against the schema. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-3-1)

Each schema object is independently evaluated against each instance location
to which it applies. This greatly simplifies the implementation requirements
for validators by ensuring that they do not need to maintain state across
the document-wide validation process. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-3-2)

This specification defines a set of assertion keywords, as well as a small vocabulary
of metadata keywords that can be used to annotate the JSON instance with
useful information. The [Section 7](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#format) keyword is intended primarily
as an annotation, but can optionally be used as an assertion. The
[Section 8](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#content) keywords are annotations for working with documents
embedded as JSON strings. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-3-3)

## [4\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-4) [Interoperability Considerations](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-interoperability-considerat)

### [4.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-4.1) [Validation of String Instances](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-validation-of-string-instan)

It should be noted that the nul character (\\u0000) is valid in a JSON string. An
instance to validate may contain a string value with this character, regardless
of the ability of the underlying programming language to deal with such data. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-4.1-1)

### [4.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-4.2) [Validation of Numeric Instances](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-validation-of-numeric-insta)

The JSON specification allows numbers with arbitrary precision, and JSON Schema
does not add any such bounds.
This means that numeric instances processed by JSON Schema can be arbitrarily large and/or
have an arbitrarily long decimal part, regardless of the ability of the
underlying programming language to deal with such data. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-4.2-1)

### [4.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-4.3) [Regular Expressions](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-regular-expressions)

Keywords that use regular expressions, or constrain the instance value
to be a regular expression, are subject to the interoperability
considerations for regular expressions in the
[JSON Schema Core](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema) \[ [json-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema)\] specification. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-4.3-1)

## [5\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-5) [Meta-Schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-meta-schema)

The current URI for the default JSON Schema dialect meta-schema is
[https://json-schema.org/draft/2020-12/schema](https://json-schema.org/draft/2020-12/schema).
For schema author convenience, this meta-schema describes a dialect
consisting of all vocabularies
defined in this specification and the JSON Schema Core specification,
as well as two former keywords which are reserved for a transitional period.
Individual vocabulary and vocabulary meta-schema URIs are given for
each section below. Certain vocabularies are optional to support, which
is explained in detail in the relevant sections. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-5-1)

Updated vocabulary and meta-schema URIs MAY be published between
specification drafts in order to correct errors. Implementations
SHOULD consider URIs dated after this specification draft and
before the next to indicate the same syntax and semantics
as those listed here. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-5-2)

## [6\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6) [A Vocabulary for Structural Validation](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-a-vocabulary-for-structural)

Validation keywords in a schema impose requirements for successful validation of an
instance. These keywords are all assertions without any annotation behavior. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6-1)

Meta-schemas that do not use "$vocabulary" SHOULD be considered to
require this vocabulary as if its URI were present with a value of true. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6-2)

The current URI for this vocabulary, known as the Validation vocabulary, is:
<https://json-schema.org/draft/2020-12/vocab/validation>. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6-3)

The current URI for the corresponding meta-schema is:
[https://json-schema.org/draft/2020-12/meta/validation](https://json-schema.org/draft/2020-12/meta/validation). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6-4)

### [6.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.1) [Validation Keywords for Any Instance Type](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-validation-keywords-for-any)

#### [6.1.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.1.1) [type](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-type)

The value of this keyword MUST be either a string or an array. If it is
an array, elements of the array MUST be strings and MUST be unique. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.1-1)

String values MUST be one of the six primitive types
("null", "boolean", "object", "array", "number", or "string"),
or "integer" which matches any number with a zero fractional part. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.1-2)

If the value of "type" is a string, then an instance validates successfully if
its type matches the type represented by the value of the string.

If the value of "type" is an array, then an instance validates successfully if
its type matches any of the types indicated by the strings in the array. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.1-3)

#### [6.1.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.1.2) [enum](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-enum)

The value of this keyword MUST be an array. This array SHOULD have at
least one element. Elements in the array SHOULD be unique. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.2-1)

An instance validates successfully against this keyword if its value is
equal to one of the elements in this keyword's array value. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.2-2)

Elements in the array might be of any type, including null. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.2-3)

#### [6.1.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.1.3) [const](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-const)

The value of this keyword MAY be of any type, including null. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.3-1)

Use of this keyword is functionally equivalent to an
["enum"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#enum) ( [Section 6.1.2](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#enum)) with a single value. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.3-2)

An instance validates successfully against this keyword if its value is
equal to the value of the keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.1.3-3)

### [6.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.2) [Validation Keywords for Numeric Instances (number and integer)](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-validation-keywords-for-num)

#### [6.2.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.2.1) [multipleOf](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-multipleof)

The value of "multipleOf" MUST be a number, strictly greater than 0. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.1-1)

A numeric instance is valid only if division by this keyword's value results in
an integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.1-2)

#### [6.2.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.2.2) [maximum](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-maximum)

The value of "maximum" MUST be a number, representing an inclusive upper limit
for a numeric instance. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.2-1)

If the instance is a number, then this keyword validates only if the instance is
less than or exactly equal to "maximum". [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.2-2)

#### [6.2.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.2.3) [exclusiveMaximum](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-exclusivemaximum)

The value of "exclusiveMaximum" MUST be a number, representing an exclusive upper
limit for a numeric instance. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.3-1)

If the instance is a number, then the instance is valid only if it has a value
strictly less than (not equal to) "exclusiveMaximum". [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.3-2)

#### [6.2.4.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.2.4) [minimum](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-minimum)

The value of "minimum" MUST be a number, representing an inclusive lower limit
for a numeric instance. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.4-1)

If the instance is a number, then this keyword validates only if the instance is
greater than or exactly equal to "minimum". [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.4-2)

#### [6.2.5.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.2.5) [exclusiveMinimum](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-exclusiveminimum)

The value of "exclusiveMinimum" MUST be a number, representing an exclusive lower
limit for a numeric instance. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.5-1)

If the instance is a number, then the instance is valid only if it has a value
strictly greater than (not equal to) "exclusiveMinimum". [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.2.5-2)

### [6.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.3) [Validation Keywords for Strings](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-validation-keywords-for-str)

#### [6.3.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.3.1) [maxLength](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-maxlength)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.1-1)

A string instance is valid against this keyword if its
length is less than, or equal to, the value of this keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.1-2)

The length of a string instance is defined as the number of its
characters as defined by [RFC 8259](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC8259) \[ [RFC8259](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC8259)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.1-3)

#### [6.3.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.3.2) [minLength](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-minlength)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.2-1)

A string instance is valid against this keyword if its
length is greater than, or equal to, the value of this keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.2-2)

The length of a string instance is defined as the number of its
characters as defined by [RFC 8259](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC8259) \[ [RFC8259](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC8259)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.2-3)

Omitting this keyword has the same behavior as a value of 0. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.2-4)

#### [6.3.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.3.3) [pattern](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-pattern)

The value of this keyword MUST be a string. This string SHOULD be a
valid regular expression, according to the ECMA-262 regular expression
dialect. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.3-1)

A string instance is considered valid if the regular
expression matches the instance successfully. Recall: regular
expressions are not implicitly anchored. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.3.3-2)

### [6.4.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.4) [Validation Keywords for Arrays](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-validation-keywords-for-arr)

#### [6.4.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.4.1) [maxItems](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-maxitems)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.1-1)

An array instance is valid against "maxItems" if its size is
less than, or equal to, the value of this keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.1-2)

#### [6.4.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.4.2) [minItems](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-minitems)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.2-1)

An array instance is valid against "minItems" if its size is
greater than, or equal to, the value of this keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.2-2)

Omitting this keyword has the same behavior as a value of 0. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.2-3)

#### [6.4.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.4.3) [uniqueItems](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-uniqueitems)

The value of this keyword MUST be a boolean. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.3-1)

If this keyword has boolean value false, the instance validates
successfully. If it has boolean value true, the instance validates
successfully if all of its elements are unique. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.3-2)

Omitting this keyword has the same behavior as a value of false. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.3-3)

#### [6.4.4.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.4.4) [maxContains](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-maxcontains)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.4-1)

If "contains" is not present within the same schema object,
then this keyword has no effect. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.4-2)

An instance array is valid against "maxContains" in two ways, depending on
the form of the annotation result of an adjacent
["contains"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema) \[ [json-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema)\] keyword. The first way is if
the annotation result is an array and the length of that array is less than
or equal to the "maxContains" value. The second way is if the annotation
result is a boolean "true" and the instance array length is less than or
equal to the "maxContains" value. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.4-3)

#### [6.4.5.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.4.5) [minContains](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-mincontains)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.5-1)

If "contains" is not present within the same schema object,
then this keyword has no effect. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.5-2)

An instance array is valid against "minContains" in two ways, depending on
the form of the annotation result of an adjacent
["contains"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema) \[ [json-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema)\] keyword. The first way is if
the annotation result is an array and the length of that array is greater
than or equal to the "minContains" value. The second way is if the
annotation result is a boolean "true" and the instance array length is
greater than or equal to the "minContains" value. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.5-3)

A value of 0 is allowed, but is only useful for setting a range
of occurrences from 0 to the value of "maxContains". A value of
0 causes "minContains" and "contains" to always pass validation
(but validation can still fail against a "maxContains" keyword). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.5-4)

Omitting this keyword has the same behavior as a value of 1. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.4.5-5)

### [6.5.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.5) [Validation Keywords for Objects](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-validation-keywords-for-obj)

#### [6.5.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.5.1) [maxProperties](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-maxproperties)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.1-1)

An object instance is valid against "maxProperties" if its
number of properties is less than, or equal to, the value of this
keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.1-2)

#### [6.5.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.5.2) [minProperties](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-minproperties)

The value of this keyword MUST be a non-negative integer. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.2-1)

An object instance is valid against "minProperties" if its
number of properties is greater than, or equal to, the value of this
keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.2-2)

Omitting this keyword has the same behavior as a value of 0. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.2-3)

#### [6.5.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.5.3) [required](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-required)

The value of this keyword MUST be an array.
Elements of this array, if any, MUST be strings, and MUST be unique. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.3-1)

An object instance is valid against this keyword if every item in the array is
the name of a property in the instance. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.3-2)

Omitting this keyword has the same behavior as an empty array. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.3-3)

#### [6.5.4.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-6.5.4) [dependentRequired](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-dependentrequired)

The value of this keyword MUST be an object. Properties in
this object, if any, MUST be arrays. Elements in each array,
if any, MUST be strings, and MUST be unique. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.4-1)

This keyword specifies properties that are required if a specific
other property is present. Their requirement is dependent on the
presence of the other property. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.4-2)

Validation succeeds if, for each name that appears in both
the instance and as a name within this keyword's value, every
item in the corresponding array is also the name of a property
in the instance. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.4-3)

Omitting this keyword has the same behavior as an empty object. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-6.5.4-4)

## [7\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7) [Vocabularies for Semantic Content With "format"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-vocabularies-for-semantic-c)

### [7.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.1) [Foreword](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-foreword)

Structural validation alone may be insufficient to allow an application to correctly
utilize certain values. The "format" annotation keyword is defined to allow schema
authors to convey semantic information for a fixed subset of values which are
accurately described by authoritative resources, be they RFCs or other external
specifications. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.1-1)

The value of this keyword is called a format attribute. It MUST be a string. A
format attribute can generally only validate a given set of instance types. If
the type of the instance to validate is not in this set, validation for this
format attribute and instance SHOULD succeed. All format attributes defined
in this section apply to strings, but a format attribute can be specified
to apply to any instance types defined in the data model defined in the
[core JSON Schema.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema) \[ [json-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema)\]
Note that the "type" keyword in this specification defines an "integer" type
which is not part of the data model. Therefore a format attribute can be
limited to numbers, but not specifically to integers. However, a numeric
format can be used alongside the "type" keyword with a value of "integer",
or could be explicitly defined to always pass if the number is not an integer,
which produces essentially the same behavior as only applying to integers.
[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.1-2)

The current URI for this vocabulary, known as the Format-Annotation vocabulary, is:
<https://json-schema.org/draft/2020-12/vocab/format-annotation>. The current
URI for the corresponding meta-schema is:
[https://json-schema.org/draft/2020-12/meta/format-annotation](https://json-schema.org/draft/2020-12/meta/format-annotation).
Implementing support for this vocabulary is REQUIRED. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.1-3)

In addition to the Format-Annotation vocabulary, a secondary vocabulary is available
for custom meta-schemas that defines "format" as an assertion. The URI for the
Format-Assertion vocabulary, is:
<https://json-schema.org/draft/2020-12/vocab/format-assertion>. The current
URI for the corresponding meta-schema is:
[https://json-schema.org/draft/2020-12/meta/format-assertion](https://json-schema.org/draft/2020-12/meta/format-assertion).
Implementing support for the Format-Assertion vocabulary is OPTIONAL. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.1-4)

Specifying both the Format-Annotation and the Format-Assertion vocabularies is functionally
equivalent to specifying only the Format-Assertion vocabulary since its requirements
are a superset of the Format-Annotation vocabulary. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.1-5)

### [7.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.2) [Implementation Requirements](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-implementation-requirements)

The "format" keyword functions as defined by the vocabulary which is referenced. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2-1)

#### [7.2.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.2.1) [Format-Annotation Vocabulary](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-format-annotation-vocabular)

The value of format MUST be collected as an annotation, if the implementation
supports annotation collection. This enables application-level validation when
schema validation is unavailable or inadequate. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.1-1)

Implementations MAY still treat "format" as an assertion in addition to an
annotation and attempt to validate the value's conformance to the specified
semantics. The implementation MUST provide options to enable and disable such
evaluation and MUST be disabled by default. Implementations SHOULD document
their level of support for such validation.

Specifying the Format-Annotation vocabulary and enabling validation in an
implementation should not be viewed as being equivalent to specifying
the Format-Assertion vocabulary since implementations are not required to
provide full validation support when the Format-Assertion vocabulary
is not specified.
[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.1-2)

When the implementation is configured for assertion behavior, it: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.1-3)

- SHOULD provide an implementation-specific best effort validation
for each format attribute defined below; [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.1-4.1)
- MAY choose to implement validation of any or all format attributes
as a no-op by always producing a validation result of true; [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.1-4.2)

This matches the current reality of implementations, which provide
widely varying levels of validation, including no validation at all,
for some or all format attributes. It is also designed to encourage
relying only on the annotation behavior and performing semantic
validation in the application, which is the recommended best practice.
[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.1-5)

#### [7.2.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.2.2) [Format-Assertion Vocabulary](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-format-assertion-vocabulary)

When the Format-Assertion vocabulary is declared with a value of true,
implementations MUST provide full validation support for all of the formats
defined by this specificaion. Implementations that cannot provide full
validation support MUST refuse to process the schema. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-1)

An implementation that supports the Format-Assertion vocabulary: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-2)

- MUST still collect "format" as an annotation if the implementation
supports annotation collection; [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-3.1)
- MUST evaluate "format" as an assertion; [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-3.2)
- MUST implement syntactic validation for all format attributes defined
in this specification, and for any additional format attributes that
it recognizes, such that there exist possible instance values
of the correct type that will fail validation. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-3.3)

The requirement for minimal validation of format attributes is intentionally
vague and permissive, due to the complexity involved in many of the attributes.
Note in particular that the requirement is limited to syntactic checking; it is
not to be expected that an implementation would send an email, attempt to connect
to a URL, or otherwise check the existence of an entity identified by a format
instance.

The expectation is that for simple formats such as date-time, syntactic
validation will be thorough. For a complex format such as email addresses,
which are the amalgamation of various standards and numerous adjustments
over time, with obscure and/or obsolete rules that may or may not be
restricted by other applications making use of the value, a minimal validation
is sufficient. For example, an instance string that does not contain
an "@" is clearly not a valid email address, and an "email" or "hostname"
containing characters outside of 7-bit ASCII is likewise clearly invalid.
[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-4)

It is RECOMMENDED that implementations use a common parsing library for each format,
or a well-known regular expression. Implementations SHOULD clearly document
how and to what degree each format attribute is validated. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-5)

The [standard core and validation meta-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#meta-schema) ( [Section 5](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#meta-schema))
includes this vocabulary in its "$vocabulary" keyword with a value of false,
since by default implementations are not required to support this keyword
as an assertion. Supporting the format vocabulary with a value of true is
understood to greatly increase code size and in some cases execution time,
and will not be appropriate for all implementations. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.2-6)

#### [7.2.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.2.3) [Custom format attributes](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-custom-format-attributes)

Implementations MAY support custom format attributes. Save for agreement between
parties, schema authors SHALL NOT expect a peer implementation to support such
custom format attributes. An implementation MUST NOT fail to collect unknown formats
as annotations. When the Format-Assertion vocabulary is specified, implementations
MUST fail upon encountering unknown formats. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.3-1)

Vocabularies do not support specifically declaring different value sets for keywords.
Due to this limitation, and the historically uneven implementation of this keyword,
it is RECOMMENDED to define additional keywords in a custom vocabulary rather than
additional format attributes if interoperability is desired. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.2.3-2)

### [7.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3) [Defined Formats](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-defined-formats)

#### [7.3.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.1) [Dates, Times, and Duration](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-dates-times-and-duration)

These attributes apply to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-1)

Date and time format names are derived from
[RFC 3339, section 5.6](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC3339) \[ [RFC3339](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC3339)\].
The duration format is from the ISO 8601 ABNF as given
in Appendix A of RFC 3339. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-2)

Implementations supporting formats SHOULD implement support for
the following attributes: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-3)

date-time:
A string instance is valid against this attribute if it is
a valid representation according to the "date-time' ABNF rule
(referenced above) [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-4.2)date:
A string instance is valid against this attribute if it is
a valid representation according to the "full-date" ABNF rule
(referenced above) [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-4.4)time:
A string instance is valid against this attribute if it is
a valid representation according to the "full-time" ABNF rule
(referenced above) [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-4.6)duration:
A string instance is valid against this attribute if it is
a valid representation according to the "duration" ABNF rule
(referenced above) [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-4.8)

Implementations MAY support additional attributes using the other
format names defined anywhere in that RFC. If "full-date" or "full-time"
are implemented, the corresponding short form ("date" or "time"
respectively) MUST be implemented, and MUST behave identically.
Implementations SHOULD NOT define extension attributes
with any name matching an RFC 3339 format unless it validates
according to the rules of that format.

There is not currently consensus on the need for supporting
all RFC 3339 formats, so this approach of reserving the
namespace will encourage experimentation without committing
to the entire set. Either the format implementation requirements
will become more flexible in general, or these will likely
either be promoted to fully specified attributes or dropped.
[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.1-5)

#### [7.3.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.2) [Email Addresses](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-email-addresses)

These attributes apply to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.2-1)

A string instance is valid against these attributes if it is a valid
Internet email address as follows: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.2-2)

email:
As defined by the "Mailbox" ABNF rule in
[RFC 5321, section 4.1.2](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC5321) \[ [RFC5321](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC5321)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.2-3.2)idn-email:
As defined by the extended "Mailbox" ABNF rule in
[RFC 6531, section 3.3](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC6531) \[ [RFC6531](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC6531)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.2-3.4)

Note that all strings valid against the "email" attribute are also
valid against the "idn-email" attribute. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.2-4)

#### [7.3.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.3) [Hostnames](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-hostnames)

These attributes apply to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.3-1)

A string instance is valid against these attributes if it is a valid
representation for an Internet hostname as follows: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.3-2)

hostname:
As defined by [RFC 1123, section 2.1](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC1123) \[ [RFC1123](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC1123)\],
including host names produced using the Punycode algorithm
specified in [RFC 5891, section 4.4](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC5891) \[ [RFC5891](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC5891)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.3-3.2)idn-hostname:
As defined by either RFC 1123 as for hostname, or an
internationalized hostname as defined by
[RFC 5890, section 2.3.2.3](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC5890) \[ [RFC5890](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC5890)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.3-3.4)

Note that all strings valid against the "hostname" attribute are also
valid against the "idn-hostname" attribute. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.3-4)

#### [7.3.4.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.4) [IP Addresses](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-ip-addresses)

These attributes apply to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.4-1)

A string instance is valid against these attributes if it is a valid
representation of an IP address as follows: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.4-2)

ipv4:
An IPv4 address according to the "dotted-quad" ABNF
syntax as defined in
[RFC 2673, section 3.2](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2673) \[ [RFC2673](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2673)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.4-3.2)ipv6:
An IPv6 address as defined in
[RFC 4291, section 2.2](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC4291) \[ [RFC4291](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC4291)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.4-3.4)

#### [7.3.5.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.5) [Resource Identifiers](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-resource-identifiers)

These attributes apply to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-1)

uri:
A string instance is valid against this attribute if it is
a valid URI, according to \[ [RFC3986](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC3986)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-2.2)uri-reference:
A string instance is valid against this attribute if it is a valid URI
Reference (either a URI or a relative-reference),
according to \[ [RFC3986](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC3986)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-2.4)iri:
A string instance is valid against this attribute if it is
a valid IRI, according to \[ [RFC3987](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC3987)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-2.6)iri-reference:
A string instance is valid against this attribute if it is a valid IRI
Reference (either an IRI or a relative-reference),
according to \[ [RFC3987](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC3987)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-2.8)uuid:
A string instance is valid against this attribute if it is a valid
string representation of a UUID, according to \[ [RFC4122](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC4122)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-2.10)

Note that all valid URIs are valid IRIs, and all valid URI References are
also valid IRI References. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-3)

Note also that the "uuid" format is for plain UUIDs, not UUIDs in URNs. An example
is "f81d4fae-7dec-11d0-a765-00a0c91e6bf6". For UUIDs as URNs, use the "uri" format,
with a "pattern" regular expression of "^urn:uuid:" to indicate the URI scheme and
URN namespace. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.5-4)

#### [7.3.6.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.6) [uri-template](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-uri-template)

This attribute applies to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.6-1)

A string instance is valid against this attribute if it is a valid URI Template
(of any level), according to \[ [RFC6570](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC6570)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.6-2)

Note that URI Templates may be used for IRIs; there is no separate
IRI Template specification. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.6-3)

#### [7.3.7.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.7) [JSON Pointers](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-json-pointers)

These attributes apply to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.7-1)

json-pointer:
A string instance is valid against this attribute if it
is a valid JSON string representation of a JSON Pointer,
according to [RFC 6901, section 5](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC6901) \[ [RFC6901](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC6901)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.7-2.2)relative-json-pointer:
A string instance is valid against this attribute if it is a valid
[Relative JSON Pointer](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#relative-json-pointer) \[ [relative-json-pointer](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#relative-json-pointer)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.7-2.4)

To allow for both absolute and relative JSON Pointers, use "anyOf" or
"oneOf" to indicate support for either format. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.7-3)

#### [7.3.8.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-7.3.8) [regex](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-regex)

This attribute applies to string instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.8-1)

A regular expression, which SHOULD be valid according to the
[ECMA-262](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#ecma262) \[ [ecma262](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#ecma262)\] regular expression dialect. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.8-2)

Implementations that validate formats MUST accept at least the subset of
ECMA-262 defined in the [Regular Expressions](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#regexInterop) ( [Section 4.3](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#regexInterop))
section of this specification, and SHOULD accept all valid ECMA-262 expressions. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-7.3.8-3)

## [8\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-8) [A Vocabulary for the Contents of String-Encoded Data](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-a-vocabulary-for-the-conten)

### [8.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-8.1) [Foreword](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-foreword-2)

Annotations defined in this section indicate that an instance contains
non-JSON data encoded in a JSON string. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.1-1)

These properties provide additional information required to interpret JSON data
as rich multimedia documents. They describe the type of content, how it is encoded,
and/or how it may be validated. They do not function as validation assertions;
a malformed string-encoded document MUST NOT cause the containing instance
to be considered invalid. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.1-2)

Meta-schemas that do not use "$vocabulary" SHOULD be considered to
require this vocabulary as if its URI were present with a value of true. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.1-3)

The current URI for this vocabulary, known as the Content vocabulary, is:
<https://json-schema.org/draft/2020-12/vocab/content>. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.1-4)

The current URI for the corresponding meta-schema is:
[https://json-schema.org/draft/2020-12/meta/content](https://json-schema.org/draft/2020-12/meta/content). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.1-5)

### [8.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-8.2) [Implementation Requirements](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-implementation-requirements-2)

Due to security and performance concerns, as well as the open-ended nature of
possible content types, implementations MUST NOT automatically decode, parse,
and/or validate the string contents by default. This additionally supports
the use case of embedded documents intended for processing by a different
consumer than that which processed the containing document. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.2-1)

All keywords in this section apply only to strings, and have no
effect on other data types. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.2-2)

Implementations MAY offer the ability to decode, parse, and/or validate
the string contents automatically. However, it MUST NOT perform these
operations by default, and MUST provide the validation result of each
string-encoded document separately from the enclosing document. This
process SHOULD be equivalent to fully evaluating the instance against
the original schema, followed by using the annotations to decode, parse,
and/or validate each string-encoded document.

For now, the exact mechanism of performing and returning parsed
data and/or validation results from such an automatic decoding, parsing,
and validating feature is left unspecified. Should such a feature
prove popular, it may be specified more thoroughly in a future draft.
[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.2-3)

See also the [Security Considerations](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#security) ( [Section 10](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#security))
sections for possible vulnerabilities introduced by automatically
processing the instance string according to these keywords. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.2-4)

### [8.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-8.3) [contentEncoding](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-contentencoding)

If the instance value is a string, this property defines that the string
SHOULD be interpreted as encoded binary data and decoded using the encoding
named by this property. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.3-1)

Possible values indicating base 16, 32, and 64 encodings with several
variations are listed in [RFC 4648](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC4648) \[ [RFC4648](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC4648)\]. Additionally,
sections 6.7 and 6.8 of [RFC 2045](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2045) \[ [RFC2045](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2045)\] provide
encodings used in MIME. This keyword is derived from MIME's
Content-Transfer-Encoding header, which was designed to map binary data
into ASCII characters. It is not related to HTTP's Content-Encoding header,
which is used to encode (e.g. compress or encrypt)
the content of HTTP request and responses. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.3-2)

As "base64" is defined in both RFCs, the definition
from RFC 4648 SHOULD be assumed unless the string is specifically intended
for use in a MIME context. Note that all of these encodings result in
strings consisting only of 7-bit ASCII characters. Therefore, this keyword
has no meaning for strings containing characters outside of that range. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.3-3)

If this keyword is absent, but "contentMediaType" is present, this
indicates that the encoding is the identity encoding, meaning that
no transformation was needed in order to represent the content in
a UTF-8 string. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.3-4)

The value of this property MUST be a string. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.3-5)

### [8.4.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-8.4) [contentMediaType](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-contentmediatype)

If the instance is a string, this property indicates the media type
of the contents of the string. If "contentEncoding" is present,
this property describes the decoded string. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.4-1)

The value of this property MUST be a string, which MUST be a media type,
as defined by [RFC 2046](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2046) \[ [RFC2046](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC2046)\]. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.4-2)

### [8.5.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-8.5) [contentSchema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-contentschema)

If the instance is a string, and if "contentMediaType" is present, this
property contains a schema which describes the structure of the string. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.5-1)

This keyword MAY be used with any media type that can be mapped into
JSON Schema's data model. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.5-2)

The value of this property MUST be a valid JSON schema. It SHOULD be ignored if
"contentMediaType" is not present. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.5-3)

### [8.6.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-8.6) [Example](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-example)

Here is an example schema, illustrating the use of "contentEncoding" and
"contentMediaType": [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-1)

```
{
    "type": "string",
    "contentEncoding": "base64",
    "contentMediaType": "image/png"
}

```

[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-2)

Instances described by this schema are expected to be strings,
and their values should be interpretable as base64-encoded PNG images. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-3)

Another example: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-4)

```
{
    "type": "string",
    "contentMediaType": "text/html"
}

```

[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-5)

Instances described by this schema are expected to be strings containing HTML,
using whatever character set the JSON string was decoded into.
Per section 8.1 of
[RFC 8259](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC8259) \[ [RFC8259](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC8259)\], outside of an entirely closed
system, this MUST be UTF-8. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-6)

This example describes a JWT that is MACed using the HMAC SHA-256
algorithm, and requires the "iss" and "exp" fields in its claim set. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-7)

```
{
    "type": "string",
    "contentMediaType": "application/jwt",
    "contentSchema": {
        "type": "array",
        "minItems": 2,
        "prefixItems": [\
            {\
                "const": {\
                    "typ": "JWT",\
                    "alg": "HS256"\
                }\
            },\
            {\
                "type": "object",\
                "required": ["iss", "exp"],\
                "properties": {\
                    "iss": {"type": "string"},\
                    "exp": {"type": "integer"}\
                }\
            }\
        ]
    }
}

```

[¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-8)

Note that "contentEncoding" does not appear. While the "application/jwt"
media type makes use of base64url encoding, that is defined by the media
type, which determines how the JWT string is decoded into a list of two
JSON data structures: first the header, and then the payload. Since the
JWT media type ensures that the JWT can be represented in a JSON string,
there is no need for further encoding or decoding. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-8.6-9)

## [9\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-9) [A Vocabulary for Basic Meta-Data Annotations](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-a-vocabulary-for-basic-meta)

These general-purpose annotation keywords provide commonly used information
for documentation and user interface display purposes. They are not intended
to form a comprehensive set of features. Rather, additional vocabularies
can be defined for more complex annotation-based applications. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9-1)

Meta-schemas that do not use "$vocabulary" SHOULD be considered to
require this vocabulary as if its URI were present with a value of true. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9-2)

The current URI for this vocabulary, known as the Meta-Data vocabulary, is:
<https://json-schema.org/draft/2020-12/vocab/meta-data>. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9-3)

The current URI for the corresponding meta-schema is:
[https://json-schema.org/draft/2020-12/meta/meta-data](https://json-schema.org/draft/2020-12/meta/meta-data). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9-4)

### [9.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-9.1) ["title" and "description"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-title-and-description)

The value of both of these keywords MUST be a string. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.1-1)

Both of these keywords can be used to decorate a user interface with
information about the data produced by this user interface. A title will
preferably be short, whereas a description will provide explanation about
the purpose of the instance described by this schema. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.1-2)

### [9.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-9.2) ["default"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-default)

There are no restrictions placed on the value of this keyword. When
multiple occurrences of this keyword are applicable to a single
sub-instance, implementations SHOULD remove duplicates. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.2-1)

This keyword can be used to supply a default JSON value associated with a
particular schema. It is RECOMMENDED that a default value be valid against
the associated schema. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.2-2)

### [9.3.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-9.3) ["deprecated"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-deprecated)

The value of this keyword MUST be a boolean. When multiple occurrences
of this keyword are applicable to a single sub-instance, applications
SHOULD consider the instance location to be deprecated if any occurrence
specifies a true value. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.3-1)

If "deprecated" has a value of boolean true, it indicates that applications
SHOULD refrain from usage of the declared property. It MAY mean the property
is going to be removed in the future. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.3-2)

A root schema containing "deprecated" with a value of true indicates that
the entire resource being described MAY be removed in the future. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.3-3)

The "deprecated" keyword applies to each instance location to which the
schema object containing the keyword successfully applies. This can
result in scenarios where every array item or object property
is deprecated even though the containing array or object is not. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.3-4)

Omitting this keyword has the same behavior as a value of false. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.3-5)

### [9.4.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-9.4) ["readOnly" and "writeOnly"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-readonly-and-writeonly)

The value of these keywords MUST be a boolean. When multiple occurrences
of these keywords are applicable to a single sub-instance, the resulting
behavior SHOULD be as for a true value if any occurrence specifies a true value,
and SHOULD be as for a false value otherwise. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-1)

If "readOnly" has a value of boolean true, it indicates that the value
of the instance is managed exclusively by the owning authority, and
attempts by an application to modify the value of this property are
expected to be ignored or rejected by that owning authority. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-2)

An instance document that is marked as "readOnly" for the entire document
MAY be ignored if sent to the owning authority, or MAY result in an
error, at the authority's discretion. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-3)

If "writeOnly" has a value of boolean true, it indicates that the value
is never present when the instance is retrieved from the owning authority.
It can be present when sent to the owning authority to update or create
the document (or the resource it represents), but it will not be included
in any updated or newly created version of the instance. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-4)

An instance document that is marked as "writeOnly" for the entire document
MAY be returned as a blank document of some sort, or MAY produce an error
upon retrieval, or have the retrieval request ignored, at the authority's
discretion. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-5)

For example, "readOnly" would be used to mark a database-generated serial
number as read-only, while "writeOnly" would be used to mark a password
input field. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-6)

These keywords can be used to assist in user interface instance generation.
In particular, an application MAY choose to use a widget that hides
input values as they are typed for write-only fields. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-7)

Omitting these keywords has the same behavior as values of false. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.4-8)

### [9.5.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-9.5) ["examples"](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-examples)

The value of this keyword MUST be an array.
There are no restrictions placed on the values within the array.
When multiple occurrences of this keyword are applicable to a single
sub-instance, implementations MUST provide a flat array of all
values rather than an array of arrays. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.5-1)

This keyword can be used to provide sample JSON values associated with a
particular schema, for the purpose of illustrating usage. It is
RECOMMENDED that these values be valid against the associated schema. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.5-2)

Implementations MAY use the value(s) of "default", if present, as
an additional example. If "examples" is absent, "default"
MAY still be used in this manner. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-9.5-3)

## [10\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-10) [Security Considerations](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-security-considerations)

JSON Schema validation defines a vocabulary for JSON Schema core and concerns all
the security considerations listed there. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-10-1)

JSON Schema validation allows the use of Regular Expressions, which have numerous
different (often incompatible) implementations.
Some implementations allow the embedding of arbitrary code, which is outside the
scope of JSON Schema and MUST NOT be permitted.
Regular expressions can often also be crafted to be extremely expensive to compute
(with so-called "catastrophic backtracking"), resulting in a denial-of-service
attack. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-10-2)

Implementations that support validating or otherwise evaluating instance
string data based on "contentEncoding" and/or "contentMediaType" are at
risk of evaluating data in an unsafe way based on misleading information.
Applications can mitigate this risk by only performing such processing
when a relationship between the schema and instance is established
(e.g., they share the same authority). [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-10-3)

Processing a media type or encoding is subject to the security considerations
of that media type or encoding. For example, the security considerations
of [RFC 4329 Scripting Media Types](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC4329) \[ [RFC4329](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#RFC4329)\] apply when
processing JavaScript or ECMAScript encoded within a JSON string. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#section-10-4)

## [11\.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-11) [References](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-references)

### [11.1.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-11.1) [Normative References](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-normative-references)

\[RFC2119\]Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, DOI 10.17487/RFC2119, March 1997, < [https://www.rfc-editor.org/info/rfc2119](https://www.rfc-editor.org/info/rfc2119) >. \[RFC1123\]Braden, R., Ed., "Requirements for Internet Hosts - Application and Support", STD 3, RFC 1123, DOI 10.17487/RFC1123, October 1989, < [https://www.rfc-editor.org/info/rfc1123](https://www.rfc-editor.org/info/rfc1123) >. \[RFC2045\]Freed, N. and N. Borenstein, "Multipurpose Internet Mail Extensions (MIME) Part One: Format of Internet Message Bodies", RFC 2045, DOI 10.17487/RFC2045, November 1996, < [https://www.rfc-editor.org/info/rfc2045](https://www.rfc-editor.org/info/rfc2045) >. \[RFC2046\]Freed, N. and N. Borenstein, "Multipurpose Internet Mail Extensions (MIME) Part Two: Media Types", RFC 2046, DOI 10.17487/RFC2046, November 1996, < [https://www.rfc-editor.org/info/rfc2046](https://www.rfc-editor.org/info/rfc2046) >. \[RFC2673\]Crawford, M., "Binary Labels in the Domain Name System", RFC 2673, DOI 10.17487/RFC2673, August 1999, < [https://www.rfc-editor.org/info/rfc2673](https://www.rfc-editor.org/info/rfc2673) >. \[RFC3339\]Klyne, G. and C. Newman, "Date and Time on the Internet: Timestamps", RFC 3339, DOI 10.17487/RFC3339, July 2002, < [https://www.rfc-editor.org/info/rfc3339](https://www.rfc-editor.org/info/rfc3339) >. \[RFC3986\]Berners-Lee, T., Fielding, R., and L. Masinter, "Uniform Resource Identifier (URI): Generic Syntax", STD 66, RFC 3986, DOI 10.17487/RFC3986, January 2005, < [https://www.rfc-editor.org/info/rfc3986](https://www.rfc-editor.org/info/rfc3986) >. \[RFC3987\]Duerst, M. and M. Suignard, "Internationalized Resource Identifiers (IRIs)", RFC 3987, DOI 10.17487/RFC3987, January 2005, < [https://www.rfc-editor.org/info/rfc3987](https://www.rfc-editor.org/info/rfc3987) >. \[RFC4122\]Leach, P., Mealling, M., and R. Salz, "A Universally Unique IDentifier (UUID) URN Namespace", RFC 4122, DOI 10.17487/RFC4122, July 2005, < [https://www.rfc-editor.org/info/rfc4122](https://www.rfc-editor.org/info/rfc4122) >. \[RFC4291\]Hinden, R. and S. Deering, "IP Version 6 Addressing Architecture", RFC 4291, DOI 10.17487/RFC4291, February 2006, < [https://www.rfc-editor.org/info/rfc4291](https://www.rfc-editor.org/info/rfc4291) >. \[RFC4648\]Josefsson, S., "The Base16, Base32, and Base64 Data Encodings", RFC 4648, DOI 10.17487/RFC4648, October 2006, < [https://www.rfc-editor.org/info/rfc4648](https://www.rfc-editor.org/info/rfc4648) >. \[RFC5321\]Klensin, J., "Simple Mail Transfer Protocol", RFC 5321, DOI 10.17487/RFC5321, October 2008, < [https://www.rfc-editor.org/info/rfc5321](https://www.rfc-editor.org/info/rfc5321) >. \[RFC5890\]Klensin, J., "Internationalized Domain Names for Applications (IDNA): Definitions and Document Framework", RFC 5890, DOI 10.17487/RFC5890, August 2010, < [https://www.rfc-editor.org/info/rfc5890](https://www.rfc-editor.org/info/rfc5890) >. \[RFC5891\]Klensin, J., "Internationalized Domain Names in Applications (IDNA): Protocol", RFC 5891, DOI 10.17487/RFC5891, August 2010, < [https://www.rfc-editor.org/info/rfc5891](https://www.rfc-editor.org/info/rfc5891) >. \[RFC6570\]Gregorio, J., Fielding, R., Hadley, M., Nottingham, M., and D. Orchard, "URI Template", RFC 6570, DOI 10.17487/RFC6570, March 2012, < [https://www.rfc-editor.org/info/rfc6570](https://www.rfc-editor.org/info/rfc6570) >. \[RFC6531\]Yao, J. and W. Mao, "SMTP Extension for Internationalized Email", RFC 6531, DOI 10.17487/RFC6531, February 2012, < [https://www.rfc-editor.org/info/rfc6531](https://www.rfc-editor.org/info/rfc6531) >. \[RFC6901\]Bryan, P., Ed., Zyp, K., and M. Nottingham, Ed., "JavaScript Object Notation (JSON) Pointer", RFC 6901, DOI 10.17487/RFC6901, April 2013, < [https://www.rfc-editor.org/info/rfc6901](https://www.rfc-editor.org/info/rfc6901) >. \[RFC8259\]Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, DOI 10.17487/RFC8259, December 2017, < [https://www.rfc-editor.org/info/rfc8259](https://www.rfc-editor.org/info/rfc8259) >. \[ecma262\]"ECMA-262, 11th edition specification", June 2020, < [https://262.ecma-international.org/5.1/](https://262.ecma-international.org/5.1/) >. \[relative-json-pointer\]Luff, G., Andrews, H., and B. Hutton, Ed., "Relative JSON Pointers", Work in Progress, Internet-Draft, draft-handrews-relative-json-pointer-01, December 2020, < [https://datatracker.ietf.org/doc/html/draft-handrews-relative-json-pointer-01](https://datatracker.ietf.org/doc/html/draft-handrews-relative-json-pointer-01) >. \[json-schema\]Wright, A., Andrews, H., Hutton, B., and G. Dennis, "JSON Schema: A Media Type for Describing JSON Documents", Work in Progress, Internet-Draft, draft-bhutton-json-schema-01, June 2022, < [https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-01](https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-01) >.

### [11.2.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#section-11.2) [Informative References](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-informative-references)

\[RFC4329\]Hoehrmann, B., "Scripting Media Types", RFC 4329, DOI 10.17487/RFC4329, April 2006, < [https://www.rfc-editor.org/info/rfc4329](https://www.rfc-editor.org/info/rfc4329) >.

## [Appendix A.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#appendix-A) [Keywords Moved from Validation to Core](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-keywords-moved-from-validat)

Several keywords have been moved from this document into the
[Core Specification](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema) \[ [json-schema](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#json-schema)\] as of this draft, in some
cases with re-naming or other changes. This affects the following former
validation keywords: [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-A-1)

"definitions"
 Renamed to "$defs" to match "$ref" and be shorter to type.
 Schema vocabulary authors SHOULD NOT define a "definitions" keyword
 with different behavior in order to avoid invalidating schemas that
 still use the older name. While "definitions" is absent in the
 single-vocabulary meta-schemas referenced by this document, it
 remains present in the default meta-schema, and implementations
 SHOULD assume that "$defs" and "definitions" have the same
 behavior when that meta-schema is used. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-A-2.2)"allOf", "anyOf", "oneOf", "not", "if", "then", "else", "items", "additionalItems", "contains", "propertyNames", "properties", "patternProperties", "additionalProperties"
 All of these keywords apply subschemas to the instance and combine
 their results, without asserting any conditions of their own.
 Without assertion keywords, these applicators can only cause assertion
 failures by using the false boolean schema, or by inverting the result
 of the true boolean schema (or equivalent schema objects).
 For this reason, they are better defined as a generic mechanism on which
 validation, hyper-schema, and extension vocabularies can all be based. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-A-2.4)"dependencies"
 This keyword had two different modes of behavior, which made it
 relatively challenging to implement and reason about.
 The schema form has been moved to Core and renamed to
 "dependentSchemas", as part of the applicator vocabulary.
 It is analogous to "properties", except that instead of applying
 its subschema to the property value, it applies it to the object
 containing the property.
 The property name array form is retained here and renamed to
 "dependentRequired", as it is an assertion which is a shortcut
 for the conditional use of the "required" assertion keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-A-2.6)

## [Appendix B.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#appendix-B) [Acknowledgments](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-acknowledgments)

Thanks to
Gary Court,
Francis Galiegue,
Kris Zyp,
and Geraint Luff
for their work on the initial drafts of JSON Schema. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-B-1)

Thanks to
Jason Desrosiers,
Daniel Perrett,
Erik Wilde,
Evgeny Poberezkin,
Brad Bowman,
Gowry Sankar,
Donald Pipowitch,
Dave Finlay,
Denis Laxalde,
Phil Sturgeon,
Shawn Silverman,
and Karen Etheridge
for their submissions and patches to the document. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-B-2)

## [Appendix C.](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#appendix-C) [ChangeLog](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-changelog)

This section to be removed before leaving Internet-Draft status. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-1)

draft-bhutton-json-schema-validation-01

- Improve and clarify the "minContains" keyword explanation [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.2.1.1)
- Remove the use of "production" in favour of "ABNF rule" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.2.1.2)

draft-bhutton-json-schema-validation-00

- Correct email format RFC reference to 5321 instead of 5322 [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.4.1.1)
- Clarified the set and meaning of "contentEncoding" values [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.4.1.2)
- Reference ECMA-262, 11th edition for regular expression support [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.4.1.3)
- Split "format" into an annotation only vocabulary and an assertion vocabulary [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.4.1.4)
- Clarify "deprecated" when applicable to arrays [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.4.1.5)

draft-handrews-json-schema-validation-02

- Grouped keywords into formal vocabularies [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.1)
- Update "format" implementation requirements in terms of vocabularies [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.2)
- By default, "format" MUST NOT be validated, although validation can be enabled [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.3)
- A vocabulary declaration can be used to require "format" validation [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.4)
- Moved "definitions" to the core spec as "$defs" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.5)
- Moved applicator keywords to the core spec [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.6)
- Renamed the array form of "dependencies" to "dependentRequired", moved the schema form to the core spec [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.7)
- Specified all "content\*" keywords as annotations, not assertions [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.8)
- Added "contentSchema" to allow applying a schema to a string-encoded document [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.9)
- Also allow RFC 4648 encodings in "contentEncoding" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.10)
- Added "minContains" and "maxContains" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.11)
- Update RFC reference for "hostname" and "idn-hostname" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.12)
- Add "uuid" and "duration" formats [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.6.1.13)

draft-handrews-json-schema-validation-01

- This draft is purely a clarification with no functional changes [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.8.1.1)
- Provided the general principle behind ignoring annotations under "not" and similar cases [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.8.1.2)
- Clarified "if"/"then"/"else" validation interactions [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.8.1.3)
- Clarified "if"/"then"/"else" behavior for annotation [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.8.1.4)
- Minor formatting and cross-referencing improvements [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.8.1.5)

draft-handrews-json-schema-validation-00

- Added "if"/"then"/"else" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.1)
- Classify keywords as assertions or annotations per the core spec [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.2)
- Warn of possibly removing "dependencies" in the future [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.3)
- Grouped validation keywords into sub-sections for readability [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.4)
- Moved "readOnly" from hyper-schema to validation meta-data [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.5)
- Added "writeOnly" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.6)
- Added string-encoded media section, with former hyper-schema "media" keywords [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.7)
- Restored "regex" format (removal was unintentional) [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.8)
- Added "date" and "time" formats, and reserved additional RFC 3339 format names [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.9)
- I18N formats: "iri", "iri-reference", "idn-hostname", "idn-email" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.10)
- Clarify that "json-pointer" format means string encoding, not URI fragment [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.11)
- Fixed typo that inverted the meaning of "minimum" and "exclusiveMinimum" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.12)
- Move format syntax references into Normative References [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.13)
- JSON is a normative requirement [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.10.1.14)

draft-wright-json-schema-validation-01

- Standardized on hyphenated format names with full words ("uriref" becomes "uri-reference") [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.1)
- Add the formats "uri-template" and "json-pointer" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.2)
- Changed "exclusiveMaximum"/"exclusiveMinimum" from boolean modifiers of "maximum"/"minimum" to independent numeric fields. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.3)
- Split the additionalItems/items into two sections [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.4)
- Reworked properties/patternProperties/additionalProperties definition [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.5)
- Added "examples" keyword [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.6)
- Added "contains" keyword [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.7)
- Allow empty "required" and "dependencies" arrays [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.8)
- Fixed "type" reference to primitive types [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.9)
- Added "const" keyword [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.10)
- Added "propertyNames" keyword [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.12.1.11)

draft-wright-json-schema-validation-00

- Added additional security considerations [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.14.1.1)
- Removed reference to "latest version" meta-schema, use numbered version instead [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.14.1.2)
- Rephrased many keyword definitions for brevity [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.14.1.3)
- Added "uriref" format that also allows relative URI references [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.14.1.4)

draft-fge-json-schema-validation-00

- Initial draft. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.1)
- Salvaged from draft v3. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.2)
- Redefine the "required" keyword. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.3)
- Remove "extends", "disallow" [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.4)
- Add "anyOf", "allOf", "oneOf", "not", "definitions", "minProperties",
   "maxProperties". [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.5)
- "dependencies" member values can no longer be single strings; at
   least one element is required in a property dependency array. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.6)
- Rename "divisibleBy" to "multipleOf". [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.7)
- "type" arrays can no longer have schemas; remove "any" as a possible
   value. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.8)
- Rework the "format" section; make support optional. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.9)
- "format": remove attributes "phone", "style", "color"; rename
   "ip-address" to "ipv4"; add references for all attributes. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.10)
- Provide algorithms to calculate schema(s) for array/object
   instances. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.11)
- Add interoperability considerations. [¶](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01#appendix-C-2.16.1.12)

## [Authors' Addresses](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01\#name-authors-addresses)

Austin Wright (editor)

Email: [aaa@bzfx.net](mailto:aaa@bzfx.net)

Henry Andrews (editor)

Email: [andrews\_henry@yahoo.com](mailto:andrews_henry@yahoo.com)

Ben Hutton (editor)

Postman

Email: [ben@jsonschema.dev](mailto:ben@jsonschema.dev)

URI: [https://jsonschema.dev](https://jsonschema.dev/)