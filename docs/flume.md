---
title: Flume介绍
tags:
 - flume
---
# Flume介绍

## 简介

flume是一个分布式的，数据采集系统，可以从不同的数据源采集数据，然后收集到一起，通常用于日志数据的采集。

### 架构图

![image-20240201182336129](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240201182336129.png)

外部数据源会发送`event` 给`Agent`，由`Agent`的`Source`接收，然后存储到`Channel`当中。`Sink`会主动从`Channel`中消费`event`，如果消费成功，就会将`event`从`Channel`中移除。`sink`拿到`event`后，会将消息进一步传递，可以是下一个`Source`,也可以是其他外部系统（如SQL数据库）。

`Flume`支持多级传输`event`，你可以部署多个`Flume`形成链式数据传输，同时也支持扇入（多对一）扇出（一对多），所以你可以结合自己的业务，灵活的组合。

## 基本概念

### event

`event`是`Flume`定义的一个最小的数据传输单元，由标题和正文组成，是一个KV结构的数据类型。

### Agent

`Agent`是一个`Flume`实例，本质是一个`JVM`进程，用来控制`event`从哪来，到哪去。`Agent`包含三个组件，分别是`Source`、`Channel`和`Sink`。

#### Source

数据的来源和方式，用来接收来自外部系统的`event`。针对不同的系统，会设计不同的`Source`，如`Avro Source`、`Thrift Source`，用来适配系统发过来的`event`。除了被动接收`event`之外，某些`Source`还会主动拉取`event`，如`Spooling Directory Source`。

#### Channel

`event`的数据缓冲通道，一个被动存储器，用来存放没有被消费的`event`。当`Source`收到`event`时，会将其存储到一个或者多个`Channel`当中，直到被`Sink`消费。

#### Sink

定义了数据输出的方式和目的地，可以是下一个`Source`，也可以是其他系统。`Sink`从`Channel`中消费`event`，将其存储在外部数据库或者转发给下一跳（下一个`Flume实例`）。

### 可靠性

只有当`Sink`将`event`成功发送出去的时候，`event`才会从`Channel`中删除，这就保证了**端到端的可靠传输**，`Channel`的存在也实现了`event`的异步传输。

`Flume`使用事务来保证`event`的**可靠传输**，`Source`和`Sink`对`Channel`提供的`event`都会封装成一个事务，用于存储和恢复，这样就保证了点到点之间的可靠传输。多层架构下，上一个`Sink`和下一个`Source`都会有事务运行，以保证`event`安全到达下一个`Channel`。
