---
title: 目标资产信息收集
tags:
 - Kali
 - 信息收集
---
# 目标资产信息收集

## 信息收集概述及分类

### 信息收集分类：

#### 主动信息收集：

需要与目标机器进行直接的交互。
缺点：容易被目标机器记录操作信息或者屏蔽。
工具：如 nmap、Scapy。
比如，你主动去问隔壁邻居小孩，你家有多少财产。

#### 被动信息收集：

不需要与目标机器进行交互，主要利用第三方站点或渠道来进行信息的收集，如google、shadan、fofa。
收集内容：
IP地址、公司地址、邮件地址、域名信息、联系电话、公司组织、技术成员、网站技术架构、主机存活情况、端口信息、敏感信息。

### Shodan搜索引擎使用方法：

Shodan是**互联网上最可怕的搜索引擎**，Shodan不是在网上搜索网址，而是直接进入互联网背后的通道，一刻不停的寻找着所有和互联网关联的服务器、摄像头、打印机、路由器等等，还能直接显示出目标的具体地理位置信息。
网址：http://shodan.io

![image-20240201190845954](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240201190845954.png)

常用的过滤命令如下所示：

* hostname：搜索指定的主机或域名。
* port：搜索指定的端口或服务。
* city：搜索指定的城市。
* org：搜索指定的组织或公司。
* isp：搜索指定的ISP供应商。
* product：搜索指定的操作系统/软件/平台。
* version：搜索指定的软件版本。
* geo：搜索指定的地理位置。
* before/after：搜索指定收录时间前后的数据，格式为 dd-mm-yy。
* net：搜索指定的IP地址或子网。

### Google搜搜引擎使用技巧：

GoogleHack就是利用Google搜索引擎来辅助进行渗透测试的。

Google直接搜索自己想要的内容，也有特定的语法可以使用，熟练使用搜索引擎语法可以让你的搜索效率和准确性大幅度提升。

常用的Google关键字：

* site：指定域名
* inurl：URL中存在的关键字页面。
* intext：网页内容里的关键字。
* filetype：指定文件类型
* intitle：网页标题中的关键字。
* link：返回你所有的指定域名链接。
* info：查找指定站点信息。
* cache：搜索Google里的内容缓存·。
* -关键字：不希望搜索结果中出现包含该关键字的网页。
* related：
  related:指令只适用于 Google，返回的结果是与某个网站有关联的页面。比如搜索related:paikau.com我们就可以得到Google所认为的与腰带厂有关联的 其他页面。 这种关联到底指的是什么，Google并没有明确说明，一般认为指的是有共同外部链接的网站。

### 实用网站：exploit database

![image-20240201191225185](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240201191225185.png)

### Maltego收集子域名信息：

挖掘子域名的重要性：

* 某个网站的主站安全比较严格，可以找主站下的子站。

方法：

1. Layer子域名挖掘机
2. 子域名挖掘工具：Maltego
3. 搜索引擎挖掘：Google
4. 证书透明公开枚举：http://censys.io/
5. 其他途径。

### FOFA搜索引擎使用方法

网址：http://fofa.so

![image-20240201191440103](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240201191440103.png)

FOFA时白帽汇推出的一款网络空间搜索引擎，它通过进行网络空间测绘，能够帮助研究人员和企业迅速进行网络资产匹配，例如进行漏洞影响范围分析、应用分布统计、应用流行度排名等。


