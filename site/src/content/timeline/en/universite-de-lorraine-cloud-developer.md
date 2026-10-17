---
title: Cloud Developer
organization: Université de Lorraine
organizationUrl: https://www.univ-lorraine.fr
location: France
kind: work
startDate: 2025-01-01
endDate: 2025-06-30
summary: >-
  Built a self-sovereign identity system on Hyperledger Indy, with the blockchain
  agents and application tiers deployed across AWS.
tech:
  - AWS
  - Amazon ECS
  - Amazon EC2
  - Docker
  - Kubernetes
  - Hyperledger Indy
  - FastAPI
  - Vue
  - MongoDB
---

A blockchain identity system built on the Self-Sovereign Identity model, using
Hyperledger Indy — identity data belongs to the person it describes rather than
to whichever service is asking.

The Aca-Py agents that act on the blockchain run as Docker containers on ECS
Fargate. The application tiers around them — a Vue front end and a FastAPI and
MongoDB back end — run on EC2, deliberately split across public and private
subnets so only the front end is reachable from outside.
