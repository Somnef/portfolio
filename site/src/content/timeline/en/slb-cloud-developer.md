---
title: Cloud Developer
organization: SLB
organizationUrl: https://www.slb.com
kind: work
startDate: 2023-01-01
endDate: 2023-07-31
summary: >-
  Asset-tracking on a private Hyperledger Fabric network, handling 1,000+
  transactions a day against losses that cost up to 75% of an asset's value in penalties.
tech:
  - AWS
  - Amazon API Gateway
  - Amazon ECS
  - Amazon EC2
  - Docker
  - Hyperledger Fabric
  - Node.js
  - Express
  - Vue
  - Solidity
---

Imported assets were going missing, and each loss cost the company up to 75% of
the asset's original value in penalties. The fix was a tracking system with a
tamper-evident record of custody.

A REST API handling over 1,000 transactions a day sits in front of a private
Hyperledger Fabric network, with a Flask and Vue application for the people
actually logging and querying movements. The API runs on API Gateway, the
blockchain on ECS Fargate, and the front and back ends on EC2.
