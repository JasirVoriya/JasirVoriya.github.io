---
title: Redis介绍与部分原理
top: 1
sticky: 2
tags:
  - Redis
  - 数据库
  - NoSQL
  - C
---
# Redis数据结构

简单动态字符串（sds）、链表（linkedlist）、字典（hashtable）、跳表（skiplist）、整数集合（intset）、压缩列表（ziplist）。

## SDS

 二进制安全（C语言中间可能出现\0）

动态扩容的缩容。

## IntSet

整数、有序、升级、不支持降级。

```c
//intset.h
/* Note that these encodings are ordered, so:
 * INTSET_ENC_INT16 < INTSET_ENC_INT32 < INTSET_ENC_INT64. */
#define INTSET_ENC_INT16 (sizeof(int16_t))
#define INTSET_ENC_INT32 (sizeof(int32_t))
#define INTSET_ENC_INT64 (sizeof(int64_t))

//intset.c
typedef struct intset {
    uint32_t encoding;//编码方式，支持16、32、64
    uint32_t length;//元素个数
    int8_t contents[];//整数数组，使用了c的不定长数组，在做升级的时候，非常方便
} intset;
```

采用插入排序的方式添加元素，保证有序。

升级的好处是节省内存，注意这里的升级使用的 realloc，不需要我们将老数据copy到新开辟的数组，而是直接复用之前的内存（只是有可能），我们只需要做升级所需要的数据迁移就行。

但是如果升级到int64，后面又把int64的整数全都删掉了，intset不会降级，所以需要注意这个。

## Dict

```c
struct dictEntry {
    void *key;
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v;
    struct dictEntry *next;     /* Next entry in the same hash bucket. */
    void *metadata[];           /* An arbitrary number of bytes (starting at a
                                 * pointer-aligned address) of size as returned
                                 * by dictType's dictEntryMetadataBytes(). */
};
```

```c
struct dict {
    dictType *type;

    dictEntry **ht_table[2];//两个hash表，用来做rehash的渐进式扩容
    unsigned long ht_used[2];

    long rehashidx; /* rehashing not in progress if rehashidx == -1 */

    /* Keep small vars at end for optimal (minimal) struct padding */
    int16_t pauserehash; /* If >0 rehashing is paused (<0 indicates coding error) */
    signed char ht_size_exp[2]; /* exponent of size. (size = 1<<exp) */

    void *metadata[];           /* An arbitrary number of bytes (starting at a
                                 * pointer-aligned address) of size as defined
                                 * by dictType's dictEntryBytes. */
};
```

rehash动态扩容，会扩大hash表的长度，这个时候会对hash表的每个桶都做rehash，重新将元素搬移到新的hash表上。

Redis是采用渐进式hash扩容，将扩容分散到每个增删查改指令，防止线程阻塞。每次只rehash一个桶。扩容期间，两个hash表会同时使用。

## ZipList

当列表键只包含少量列表项，且要么是小整数，要么就是较短的字符串，那么Redis会选择ZipList来实现。

ZipList是一种“双端链表”，但是其实是一块连续空间。

```c
/* Each entry in the ziplist is either a string or an integer. */
typedef struct {
    /* When string is used, it is provided with the length (slen). */
    unsigned char *sval;
    unsigned int slen;
    /* When integer is used, 'sval' is NULL, and lval holds the value. */
    long long lval;
} ziplistEntry;


```

## SkipList和Zset

```c
/* ZSETs use a specialized version of Skiplists */
typedef struct zskiplistNode {
    sds ele;
    double score;
    struct zskiplistNode *backward;
    struct zskiplistLevel {
        struct zskiplistNode *forward;
        unsigned long span;
    } level[];
} zskiplistNode;

typedef struct zskiplist {
    struct zskiplistNode *header, *tail;
    unsigned long length;
    int level;
} zskiplist;

typedef struct zset {
    dict *dict;
    zskiplist *zsl;
} zset;
```

# Redis对象

Redis并没有直接使用数据结构来实现键值对，而是基于这些数据结构创建了一个对象系统。每种对象至少用到了一种数据结构。根据不同类型的对象，Redis在执行命令前会判断，该命令是否适用于该对象。我们可以针对不同的使用场景，为对象使用不同的数据结构实现，从而优化使用效率。

Redis每个对象都是由一个redisObject结构表示：

```C
/* The actual Redis Object */
#define OBJ_STRING 0    /* String object. */
#define OBJ_LIST 1      /* List object. */
#define OBJ_SET 2       /* Set object. */
#define OBJ_ZSET 3      /* Sorted set object. */
#define OBJ_HASH 4      /* Hash object. */

struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    //lru为最后一次被访问的时间，用来做内存淘汰
    unsigned lru:LRU_BITS; /* LRU time (relative to global lru_clock) or
                            * LFU data (least significant 8 bits frequency
                            * and most significant 16 bits access time). */
    int refcount;//引用计数器，用来做内存回收
    void *ptr;
};
```



type字段记录的对象类型：

| 类型常量   | 对象的名称   |
| ---------- | ------------ |
| OBJ_STRING | 字符串对象   |
| OBJ_LIST   | 列表对象     |
| OBJ_HASH   | 哈希对象     |
| OBJ_SET    | 集合对象     |
| OBJ_ZSET   | 有序集合对象 |

encoding字段记录了对象所使用的编码，也就是对象底层使用的什么数据结构：

| 编码常量                  | 对应数据结构               |
| ------------------------- | -------------------------- |
| REDIS_ENCODING_INT        | long类型的整数             |
| REDIS_ENCODING_EMBSTR     | embstr编码的简单动态字符串 |
| REDIS_ENCODING_RAW        | 简单动态字符串             |
| REDIS_ENCODING_HT         | 字典                       |
| REDIS_ENCODING_LINKEDLIST | 双端链表                   |
| REDIS_ENCODING_ZIPLIST    | 压缩列表                   |
| REDIS_ENCODING_INTSET     | 整数集合                   |
| REDIS_ENCODING_SKIPLIST   | 跳跃表和字典               |

| 类型常量   | 编码方式                                          |
| ---------- | ------------------------------------------------- |
| OBJ_STRING | int、embstr、raw                                  |
| OBJ_LIST   | LinkedList和ZipList(3.2以前)、QuickList (3.2以后) |
| OBJ_HASH   | ZipList、HT                                       |
| OBJ_SET    | intset、HT                                        |
| OBJ_ZSET   | ZipList、zset                                     |

embstr和raw都是sds，区别是embstr是连续内存（结构体最后是一个不定长数组）。而raw不是，他会分配两块空间（元数据+元素数组）。

embstr元素长度不能超过44字节，否则就转换的raw，原因是sds元数据占20个字节，20+44=64，不会产生内存碎片。

zset结构同时包含hashtable（值查分）和skiplist（分查值）。

下面的类型其实就是OBJ_STRING：

GEO：地理坐标

BitMap：位图

HyperLog：不精确的去重计数

# 网络模型

## 用户空间和内核空间

为了避免用户应用和内核冲突，保护内核，用户和内核进程的寻址空间被划分成用户空间和内核空间。

用户空间的权限受限，在执行一些高权限命令的时候，就需要通过内核提供的接口来访问（切换到内核空间）。

## 阻塞IO

![image-20230915141424639](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915141424639.png)

![image-20230915141619505](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915141619505.png)

阻塞IO在没有数据的时候会阻塞，直到有数据。

## 非阻塞IO

![image-20230915141854777](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915141814780.png)

非阻塞io在等待数据的时候不会阻塞，会一直询问内核，CPU一直空转，在这一直问，没有干其他的，其实性能也没有啥提升，甚至更高。

数据就绪之后，copy到用户缓冲区的时候，会阻塞。

## IO多路复用

阻塞和非阻塞区别就是在等到数据时的不同，但是两者都没有发挥CPU的作用。

linux一切皆文件，每个文件都有一个**文件描述符FD**，从0递增的无符号整数，用来关联每一个文件。

IO多路复用就是用单个线程来监听多个Socket FD，从而避免无效等待。

![image-20230915143624891](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915143624891.png)

IO多路复用有多种实现：select、poll、epoll。

select和poll只会通知用户进程有IO就绪，但是不知道是哪一个，还需要逐个遍历确认。

epoll就可以知道具体是哪几个IO就绪，可以直接去处理IO事件。

### select

最早的多路复用实现方案：

![image-20230915144406306](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915144406306.png)

select需要copy两次fd_set，一次是从内核到用户，然后就是用户到内核。所以为了加快copy速度，节省内存，fd_set用每一个bit位来标记某一个fd是否就绪。

但是因为是bit位来标记，我们也只能知道是否有fd就绪，但是不知道具体是哪一个，所以我们就需要一个个bit位去遍历。

### poll

poll对select做了简单改进：

![image-20230915145911664](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915145911664.png)

* poll会创建pollfd数组，然后调用poll函数，将数组copy到内核，然后转成链表。

* 内核就会监听fd到就绪或超时，把数组copy到用户空间，返回fd数量n。

* 用户遍历数组，找到就绪的fd。处理完之后，再copy到内核

poll对于select来说，使用了链表，改进了最多监听1024个fd的限制，在性能上面没有什么优化，基本上不怎么用

### epoll

对于前两者的巨大改进，提供三个函数：

![image-20230915151058863](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915151058863.png)

epoll通过链表，每次都只copy就绪的fd到用户空间。

epoll通过把监听的fd放入红黑树，加快了增删改查的速度。

![image-20230915151448246](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230915151448246.png)

所以epoll模式完胜前面两个。

## 信号驱动IO

## 异步IO

## Redis网络模型

整个Redis是多线程，如果是核心业务，是单线程。

* Redis基于内存，性能瓶颈主要是在网络IO，所以多线程意义不大。
* 多线程就会引入锁机制，面临线程安全问题，使复杂度增高。

Redis是基于IO多路复用来提高网络性能，并支持各种不同的多路复用实现。

# 通讯协议（RESP）

* Redis1.2 使用RESP
* Redis2.0 使用的协议，被叫做RESP2
* Redis6.0 升级到了RESP3，并支持客户端缓存。

但是默认使用的还是RESP2（考虑兼容性问题）。

![image-20230914165235823](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230914165235823.png)

# 内存策略

配置Redis最大内存：

```shell
maxmemory 1gb
```

## 过期策略

当key的TTL到期之后，对应的内存也释放了，从而起到内存回收。

### 检测一个key是否过期

```c
typedef struct redisDb {
    dict *dict;                 /* 数据库key空间，保存数据库所有键值对 */
    dict *expires;              /* 存放每一个key对应的TTL，只有存放设置了TTL的key */
    dict *blocking_keys;        /* Keys with clients waiting for data (BLPOP)*/
    dict *blocking_keys_unblock_on_nokey;   /* Keys with clients waiting for
                                             * data, and should be unblocked if key is deleted (XREADEDGROUP).
                                             * This is a subset of blocking_keys*/
    dict *ready_keys;           /* Blocked keys that received a PUSH */
    dict *watched_keys;         /* WATCHED keys for MULTI/EXEC CAS */
    int id;                     /* Database ID */
    long long avg_ttl;          /* Average TTL, just for stats */
    unsigned long expires_cursor; /* Cursor of the active expire cycle. */
    list *defrag_later;         /* List of key names to attempt to defrag one by one, gradually. */
    clusterSlotToKeyMapping *slots_to_keys; /* Array of slots to keys. Only used in cluster mode (db 0). */
} redisDb;
```

专门拿一个dict记录key的TTL

### 释放过期key的时期（惰性删除和周期删除）

Redis不会跟踪所有Key的TTL过期时间，过期就马上删除，这样的性能消耗太大了。

* 惰性删除：把删除分散到每一个增删查改的命令上面。
* 周期删除：设置定时任务，定期清理过期key。

Redis是两者结合起来，一个不错的淘汰策略。

Redis定义了一个函数来实现惰性删除：

```c
/* The return value of the function is 0 if the key is still valid,
 * otherwise the function returns 1 if the key is expired. */
int expireIfNeeded(redisDb *db, robj *key, int flags);
```

所有命令执行前都会调用该函数，如果过期了，该函数会删除key。

定期删除的函数实现：

```c
void activeExpireCycle(int type);
```

服务器周期性执行serverCron函数时，会调用该函数，实现定期删除：

```c
int serverCron(struct aeEventLoop *eventLoop, long long id, void *clientData);
```

## 淘汰策略

内存满了之后，就需要手动移除一些key，这就要根据淘汰策略去溢出key。

服务器在执行客户端命令的方法中，会尝试检查和做内存淘汰：

```c
//执行客户端命令的方法，里面有一段代码就是尝试内存淘汰
int processCommand(client *c);
```

Redis支持8种不同策略来选择要删除的key：

* noeviction: 不淘汰任何key，但是内存满时不允许写入新数据，默认就是这种策略
* allkeys-random:对全体key，随机进行淘汰。也就是直接从db->dict中随机挑选
* allkeys-lru:对全体key，基于LRU算法进行淘汰
* allkeys-lfu: 对全体key，基于LFU算法进行淘汰
* volatile-random: 对设置了TTL的key ，随机进行淘汰。也就是从db->expires中随机挑选
* volatile-ttl: 对设置了TTL的key，比较key的剩余TTL值，TTL越小越先被淘汰
* volatile-lru:对设置了TTL的key，基于LRU算法进行淘汰
* volatile-lfu: 对设置了TTL的key，基于LFI算法进行淘汰

```c
struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    //lru为最后一次被访问的时间，用来做内存淘汰
    unsigned lru:LRU_BITS; /* LRU time (记录最近访问时间，长度24bit) or
                            * LFU data (高16位记录分钟为单位的最近一次访问时间，低8位记录逻辑访问次数). */
    int refcount;//引用计数器，用来做内存回收
    void *ptr;
};
```



# Redis命令

## 通用命令

| 命令   | 解释                                                        |
| ------ | ----------------------------------------------------------- |
| keys   | 查看符合通配符的所有key，数据量大会阻塞，不建议生产环境使用 |
| del    | 删除给定key的数据，可以删多个                               |
| exists | 判断一个key是否存在                                         |
| expire | 给一个key设置有效期                                         |
| ttl    | 查看key的有效期，-1表示永久有效，-2表示已过期               |

增加命令以x结尾的，一般是会判读操作对象是否存在，只有存在才会继续增加，如setnx，lpushx等。

## String命令

String对象根据值的不同，会有不同的类型：字符串、整形、浮点型。其中浮点型的底层编码其实还是字符串，只不过运算的时候会转成浮点数，然后再将结果转成字符串。

| 命令        | 解释                                          |
| ----------- | --------------------------------------------- |
| set         | 添加或修改string                              |
| get         | 获取                                          |
| mset        | 批量添加或修改                                |
| mget        | 批量获取                                      |
| incr        | 整形+1                                        |
| incrby      | 整形自增指定步长                              |
| incrbyfloat | 浮点数自增指定步长                            |
| setnx       | 添加string键值对，前提是key不存在，否则不执行 |
| setex       | 添加string键值对，并指定有效期                |
| append      | 追加拼接数据在末尾                            |
| strlen      | 返回value的长度                               |
| setrange    | 替换指定下标区间的内容                        |
| getrange    | 获取指定下标区间的内容                        |



## List命令

* 命令带move的，表示将某个成员移动到另一个容器里，适用于List和Set。

* 命令带pop的表示弹出，push表示加入，对应队列和栈的操作。

| 命令    | 描述             |
| ------- | ---------------- |
| linsert | 指定位置插入元素 |
| llen    | 返回列表长度     |
| lindex  | 获取指定下标元素 |
| lset    | 修改指定下标的值 |



## Hash命令

hash也可以对指定的元素进行自增等操作。

| 命令    | 描述              |
| ------- | ----------------- |
| hexists | 查询field是否存在 |
| hlen    | 返hash成员个数    |



## Set命令

* 命令带store的，都是可以把结果保存到指定key的。
* 命令带card的，都是返回结果元素个数的。

| 命令       | 描述                   |
| ---------- | ---------------------- |
| sismember  | 查询member是否存在     |
| smismember | 批量查询member是否存在 |
| scard      | 返回集合长度           |
| sinter     | 求集合之间的交集       |
| sdiff      | 求集合的差集           |
| sunion     | 求集合的并集           |

也可以对运算之后的集合求长度。

## SortedSet命令

包含了Set的几乎所有功能。命令里带score的，都是关于分数的增删查改，可以操作单个，也可以操作分数区间。

| 命令   | 描述                        |
| ------ | --------------------------- |
| zcount | 统计指定分值内的元素个数    |
| zrank  | 返回指定元素的排名，从0开始 |
| zscore | 根据分数查元素              |
| zrem   | 删除指定元素                |

# 缓存穿透

缓存穿透是指客户端请求的数据，在缓存和数据库里面都不存在，这样缓存就永远不会生效，都会打到数据库。

## 缓存空对象

请求结果为空的时候，我们在Redis里面对这个请求缓存一个null，下次再请求，就会击中缓存，不会落到数据库：

![image-20240122174653116](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174653116.png)

* 优点：实现简单，维护方便。
* 缺点：
  * 额外的内存消耗
  * 可能造成短期数据不一致，如果往缓存放了个null，但是后来我们插入的一个数据，使得该请求是可以返回有效值的，但是缓存里面还是null，所以该请求拿不到对应的值。解决方案可以是设置TTL过期时间，或者在插入的时候自动更新缓存。

## 布隆过滤

把数据计算出hash值，然后转换成二进制位，保存到布隆过滤器中。然后判断数据是否存在，就是查看对应的位置是0还是1，因为hash冲突的原因，并不是百分百的准确。

如果判断是不存在，那就一定不存在，如果判断存在，那么可能就不存在。

![image-20240122174725981](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174725981.png)

* 优点：内存占用较少，没有多余的key

* 缺点：

  * 实现复杂，不过Redis提供了bitmap，自带的一种布隆过滤器的一种实现，简化开发

  * 存在误判可能

# 缓存雪崩

雪崩是指同一时间内大量的缓存失效或者Redis服务器宕机，导致大量数据打入数据库，带来巨大压力。

![image-20240122174749578](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174749578.png)

* 给不同Key的TTL设置成随机值，这样就能够离散化，不会同时过期。
* 针对Redis宕机造成的雪崩，可以利用Redis集群提高可用性。
* 当发现Redis出现故障时，给缓存业务添加降级限流策略，提前做一些容错处理，如快速失败，拒绝服务等，牺牲部分服务，保护整个数据库。
* 给业务添加多级缓存，缓存的使用场景是很多的，不只是能在应用层添加，浏览器也有静态缓存，我们还可以在Nginx里面添加缓存，然后再去找Redis缓存，Redis未命中还可以去JVM里面建立本地缓存，最后再落到数据库上面。

# 缓存击穿

缓存击穿也叫做热点Key问题，级一个被高并发访问且缓存重建很复杂的Key突然失效了，无数请求击中数据库，带来巨大压力。

我们再重建的时候需要重新查询数据库，但并不是查到什么就放什么，有些查询非常复杂，涉及到很多表，然后可能还需要做各种各样的运算，最终得到一个结果放入缓存。这样一个过程时间可能就比较长，几十毫秒甚至数百毫秒，这么长一段时间内，请求都会击中数据库。

![image-20240122174812318](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174812318.png)

## 互斥锁去同步重建缓存

给数据库访问加上互斥锁。当缓存未命中的时候，该线程需要去获取一个互斥锁，才能够继续访问数据库并重建缓存，缓存重建成功之后，释放锁。

当一个线程在重建缓存的时候，另一个请求过来，然后缓存未命中，然后开始获取互斥锁，此时锁会获取失败，然后等待一会，再次访问缓存，一直反复，直到缓存重建成功或者请求超时。

这样就只能有一个线程去做缓存重建，其他线程都是访问、等待、重试，访问不了数据库。

互斥锁还可能会有死锁的风险。假如在业务A里，有多个缓存的查询需求，而在业务B里，同样也有多个缓存的查询需求，有可能A获取了一个锁X，然后需要去获取锁Y，此时B已经获取了锁Y，然后需要去获取锁X，这样就会导致两个业务相互等待对方放锁，然后发生死锁现象。

![image-20240122174837742](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174837742.png)

重建过程可能需要几百毫秒，这段时间内，其他所有请求都只能等待，所以性能比较差，所以就有了逻辑过期方案。

## 逻辑过期异步重建缓存

逻辑过期并不是真的过期，当我们push数据的时候，不设置过期时间，我们在数据里面添加一个过期时间，自己在业务层面手动判断数据是否过期。

当缓存击中的时候，判断一下有没有过期，如果过期，就需要重建缓存，为了避免多个线程同时获取锁，这里也需要获取一个互斥锁，防止其他线程也来重建缓存。

和上一个方案不同的是，这里是开启一个新线程去做缓存重建，然后直接返回老数据。新线程获取锁，然后异步进行缓存重建，缓存重建完成，将锁释放。

在重建期间，如果其他线程也来访问，发现数据过期，然后会去获取锁，结果失败了，此时不会重复获取，而是直接返回旧数据。

![image-20240122174859824](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174859824.png)

| 解决方案 | 优点                                           | 缺点                                           |
| -------- | ---------------------------------------------- | ---------------------------------------------- |
| 互斥锁   | 没有额外内存消耗<br />保证一致性<br />实现简单 | 线程需要等待，性能受影响<br />可能有死锁风险   |
| 逻辑过期 | 线程无需等待，性能比较好                       | 有额外内存消耗<br />不保证一致性<br />实现复杂 |

根据不用的业务需求，选择合适的解决方案。

CAP定理，在一致性和可用性之间，要做出一个抉择。

# 锁

## 悲观锁

认为线程安全问题一定会发生，因此操作数据之前先获取锁，确保线程之间串行化执行。如Java的Synchronized、Lock都是悲观锁。

## 乐观锁

认为线程安全问题不一定会发生，因此不加锁，只是在更新数据的时候判断有没有其他线程对数据做了修改。

* 如果没有修改则认为是安全的，可以更新数据。
* 如果修改了，则说明不安全，此时可以重试或者做异常处理。

乐观锁的关键是：如何判断数据有没有做修改。

### 版本号法

这是应用最广泛和最普遍的方法。  我们在每条记录上面添加一个版本号字段，每做一次修改就对版本号+1，通过版本号，我们就能够判断数据是否被修改。   

![image-20240122174918005](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174918005.png)

### CAS法

先查出数据，然后更新的时候比较一下数据，如果和前面查出来的一样，那么就说明数据没有修改。

不过这里会发生ABA问题，即我们查出的数据是A，然后其他的一些线程把数据改成了B，然后又改回了A，此时我们再去比较，发现数据是一样的，但是这中间数据是发生过变化的。

在实际业务中需要判断一下，ABA问题对业务到底有没有影响。

# 分布式锁

满足分布式系统，或者集群模式下**多进程可见**并且**互斥**的锁，就是分布式锁。

## 分布式锁的特点

* 多进程可见：这点很容易做到。
* 进程间互斥：因为Redis是单线程模型，所以也可以做到这点。
* 高可用：Redis通过集群搭建，可以实现高可用
* 高性能：Redis是基于内存，可利用做到高性能
* 安全性：异常情况，如放锁异常，死锁等等

|        | MySQL                      | Redis                  | Zookeeper                                                |
| ------ | -------------------------- | ---------------------- | -------------------------------------------------------- |
| 互斥   | 利用InnoDB本身的互斥锁机制 | 利用setnx              | 利用节点的唯一性和有序性实现互斥                         |
| 高可用 | 好，可以搭建集群           | 好，也是通过集群       | 好，还是通过集群                                         |
| 高性能 | 基于磁盘，所以性能一般     | 好，基于内存           | 一般，集群之间强调的是一致性，导致主从同步会消耗一定性能 |
| 安全性 | 断开连接，自动释放锁       | 设置过期时间，到期释放 | 临时节点，断开连接自动释放                               |

## 锁的实现

锁的实现可以使用Redis的setnx，setnx如果key存在，则会设置失败，只有在key不存在的时候，才会成功，所以可以用作互斥锁来使用，这也是分布式锁的核心逻辑之一。设置锁的时候一般也要设置TTL，防止锁释放的时候出现错误。

## Redis实现分布式锁的误删问题

如果线程A获取分布式锁，但是在锁过期时间之后，业务还没有结束，此时Redis的锁已经自动被释放掉了。这个时候，要是有线程B来执行业务，同样能够获取到锁，这样就会出现安全问题。

线程A业务完成，就会去Redis释放锁，但是它释放的是线程B的锁，这里也会出现锁的误删问题。此时要是有线程C也来执行业务，线程C又能成功获取到锁，线程安全问题就会发生。

![image-20240122174939335](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174939335.png)

为了解决这个问题，我们可以给每个锁添加一个标识，来判断是不是自己的锁，这样就不会出现误删别人的锁的情况。

但是线程A的锁自动释放掉，线程B还是会获取到锁，这个问题还是没有避免。

## Redisson分布式锁

### setnx实现分布式锁的问题

* 不可重入：一个线程无法多次获取同一个锁，如果存在多个方法加锁，且之间相互调用，那么就会死锁。
* 不可重试：获取锁只尝试一次就返回false，没有重试机制。
* 超时释放：业务时间过长，导致锁释放，让其他线程乘虚而入。
* 主从一致性：如果使用了主从集群，主从同步会存在延迟，如果主节点宕机，就需要重新选出一个主节点，如果从节点还没有完成数据同步，那就会导致锁的丢失。**但是概率比较低**，因为Redis的主从同步非常快，是毫秒级别甚至更低。

### Redisson介绍

Redisson是一个基于Redis实现的Java驻内存数据网格，意思就是一个基于Redis实现的分布式工具集合，分布式下用到的各种工具都有，包括分布式锁。

引入依赖：

```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactid>redisson</artifactId>
    <version>3.13.6</version>
</dependency>
```

配置Redisson客户端：

```java
@Configuration
public class RedisConfig{
	@Bean
	public RedissonClient redissonClient() [
		// 配置类
        Config config = new Config();
        // 添加redis地址，这里添加了单点的地址，也可以使用config,useClusterServers()添加集
    	 config.useSingleServer().setAddress("redis://192.168.150.101:6379").setPassowrd("123321");
        // 创建客户端
		return Redisson.create(config);
    }
}
```

使用Redisson分布式锁：

```Java
@Resource
private RedissonClient redissonClient;
@Test
void testRedisson() throws InterruptedException {
    // 获取锁 (可重入)，指定锁的名称
    RLock Tock = redissonClient.getLock("anyLock");
	//试获取锁，参数分别是:获取锁的最大等待时间(期间会重试)，锁自动释放时间，时间单位
    boolean isLock = lock.tryLock(1，10， TimeUnit.SECONDS);
    //判断是否获取成功
    if(isLock){
		try System.out.println("执行业务");
    }finally {
        // 释放锁
		lock.unlock();
    }
}
```

### Redisson可重入锁原理

我们上锁的时候，会记录对应线程的标识，同时记录该线程获取锁的次数，就能够实现可重入的操作。 同一个线程获取锁的时候，对应的次数+1，放锁的时候次数-1，次数为0的时候就释放掉锁。

![image-20240122174958968](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122174958968.png)

这里的获取锁和释放锁两个操作，需要使用Lua脚本，来保证操作的原子性。

# 单机Redis问题

* 数据丢失问题：内存存储，服务器重启可能导致数据丢失。

* 并发能力问题：单节点虽然以及很不错了，但是还是有些场景下不够用。

* 故障恢复问题：引用场景很多，如分布式锁、缓存等，如果宕机，则服务全部不可用。

* 存储能力问题：基于内存就导致，单节点数据量有限。

Redis本身有数据持久化能力。搭建主从集群实现读写分离，提高并发能力。利用哨兵机制，实现健康检测和自动恢复。使用分片集群，利用插槽机制实现动态扩容。

# Redis持久化

## RDB持久化

### RDB使用

Redis Database Backup file（Redis数据备份文件），也叫做Redis数据快照。即把内存所有数据记录到磁盘中，当Redis实例故障重启，从磁盘读取快照恢复数据，快照文件默认是保存在当前运行目录。

我们需要手动连接Redis，然后执行save命令，由主进程来保存数据，在这个期间Redis会一直保存数据，其他业务都会阻塞，直到数据保存完成。

bgsave命令会在后台开启一个子进程保存数据，避免主进程受到影响，比较推荐。

Redis停机时会自动执行一次RDB。

```sh
127.0.0.1:6379> save # Redis主进程来执行RDB
OK
127.0.0.1:6379> bgsave # Redis开启子进程来执行RDB
Background saving started
127.0.0.1:6379>
```

Redis也提供内部触发RDB机制，可以在redis.conf文件下找到相关配置：

```shell
# 900秒内，如果至少有1个key被修改，则执行bgsave，如果是save "" 则表示禁用RDB
save 900 1

#是否压缩，建议不开启，压缩也会消耗cpu，磁盘的话也不值钱
rdbcompression yes
# RDB文件名称
dbfilename dump.rdb
#文件保存的路径目录 
dir ./
```

### RDB后台备份原理（fork子进程）

bgsave开始时会fork主进程得到子进程，子进程共享主进程的内存数据，fork完成后读取内存数据并写入RDB文件。

操作系统里，所有进程都不能直接操作内存，而是由操作系统给每个进程分配一个虚拟内存，然后由页表来管理虚拟内存和物理内存之间的映射关系。

而fork子进程的时候，不会复制主进程相同的数据，而是复制主进程一份页表，这样就实现了子进程和主进程的内存共享。

因为是异步备份，在备份的同时，主进程还会对数据进行增删改，这样就会造成冲突，为了避免这个问题的发生，fork采用了copy-on-write技术：

* 当主进程执行读操作时，访问共享内存。
* 当主进程执行写操作时，会copy一份数据，改变页表映射关系，然后执行写操作。之后再读的时候，访问的就是copy的数据。

![image-20230911145257990](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230911145257990.png)

极端情况下，可能所有数据都被修改，这样就会导致所有数据都被copy一份，这样就造成了双倍的内存消耗。

## AOF持久化

RDB持久化可能会导致数据丢失，因为两次备份之间的时间间隔是比较长的。

AOF全称Append Only File（追加文件）。Redis处理的每个命令都会记录再AOF文件，可以看作是命令日志文件。

![image-20230911152454013](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230911152454013.png)

$3表示的是命令的长度，即长度为3。

AOF默认是关闭的，可以去redis.conf配置文件开启：

```shell
#是否开启AOF功能，默认是no
appendonly yes
#AOF文件的名称
appendfilename "appendonly.aof"

#表示每执行一次写命令，立即记录到AOF文件
appendfsync always
# 写命令执行完先放入AOF缓冲区，然后表示每隔1秒将缓冲区数据写到AOF文件，是默认方案
appendfsync everysec
#写命令执行完先放入AOF缓冲区，由操作系统决定何时将缓冲区内容写回磁盘
appendfsync no
```

AOF操作也是由主进程来完成的。所以也会对业务造成阻塞。

所以always方案情况下，每次操作都同时是写入内存和磁盘，然后返回数据，这效率直接就退化到了磁盘数据库了，所以性能最差。

| 配置项   | 刷盘时机     | 优点                   | 缺点             |
| -------- | ------------ | ---------------------- | ---------------- |
| always   | 同步刷盘     | 可靠性高，几乎不丢数据 | 性能最差         |
| everysec | 每秒刷盘     | 性能适中               | 最多丢失一秒数据 |
| no       | 操作系统控制 | 性能最好               | 可靠性差         |

但是AOF记录的是命令，即使是对同一个key的多个操作，但是只有最后一次操作才有意义，也不会去重，照样记录下来，所以AOF文件会很大。

我们可以通过bgrewiteaof命令，开启一个进程异步重写AOF文件，优化到最少的命令。

Redis也可以设置自动重写AOF文件，可以在redis.conf中配置：

```shell
# AOF文件比上次文件 增长超过多少百分比，则重写
auto-aof-rewrite-percentage 100 
# AOF文件体积超过了设定值，触发重写
auto-aof-rewrite-min-size 64mb
```

## RDB和AOF对比

|              | RDB                                      | AOF                                              |
| ------------ | ---------------------------------------- | ------------------------------------------------ |
| 持久化方式   | 定时对整个内存做快照                     | 记录每次执行的命令                               |
| 数据完整性   | 不完整，两次备份间隔大                   | 相对完整，取决于刷盘策略                         |
| 文件大小     | 小                                       | 记录命令，体积大                                 |
| 恢复速度     | 很快                                     | 慢                                               |
| 恢复优先级   | 低，因为数据完整性不如AOF                | 高                                               |
| 系统资源占用 | 高，大量消耗CPU和内存                    | 低，主要是磁盘IO，但是AOF重写会占用大量CPU和内存 |
| 使用场景     | 可容忍分钟的数据丢失，追求更快的启动速度 | 对数据安全性要求高                               |

RDB多用于数据备份和数据迁移。

# Redis主从读写分离

搭建主从集群，实现读写分离，提高并发能力，master节点用来写，slave（5.x版本之后改名叫replica）用来读。

因为Redis基本上都是读的需求大于写的需求，所以多个slave节点可以极大提高读的并发能力。

![image-20230911160042657](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230911160042657.png)

## 配置主从节点

使用replicaof或者slaveof（5.x以前）配置主从关系。

在命令行输入：

```shell
replicaof <masterip> <masterport> # 重启后失效
```

也可以在redis.conf配置文件添加上述命令，实现永久设置。

## 主从同步原理

主从第一次同步叫做，全量同步：

![image-20230911162040958](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230911162040958.png)

后续所有的同步，都会基于repl_baklog，持续同步到所有从节点。

master根据如下两个概念来判断是否是第一次同步数据：

* Replication Id：简称replid，是数据集的标记，id一致说明数据相同。每个master都有一个唯一的replid，slave则会继承master节点的replid。
* offset：偏移量，随着记录在repl_baklog中的数据增多而逐渐增大。slave完成同步时也会记录当前同步的offet。如果slave的offset小于master的offset，说明slave数据落后于master，需要更新。

因此slave做数据同步的时候，必须向master声明自己的replication id和offset，master才可以判断到底需要同步哪些数据。

如果从机重启之后再连接，则执行增量同步：

![image-20240122175506262](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122175506262.png)

repl_baklog本质上是一个循环数组，如果满了就会从头开始，覆盖之前的数据，只要从节点和主节点的数据差异不超过repl_baklog容量的最大值，就不会发生数据数据丢失，否则被覆盖的数据就无法通过repl_baklog同步：

![image-20240122180245398](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122180245398.png)

这个时候，只能去做全量同步。

优化主从集群同步：

* 再master中配置repl_diskless_sync yes来启用无磁盘复制，避免全量同步时的磁盘IO。
* Redis单节点的内存占用不要太大，减少RDB导致的过多磁盘IO。
* 适当提高repl_baklog的大小，slave尽快重启故障恢复，尽可能避免全量同步。
* 限制一个master的slave节点数量，如果实在太多slave，则可以采用主-从-从链式结构，通过从节点来同步从节点：![image-20240122175604380](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122175604380.png)

# Redis哨兵集群

哨兵（Sentinel）机制，如果master节点宕机，会选一个slave来充当master，当老master恢复后，会成为slave。哨兵的结构如下：

![image-20240122175620154](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122175620154.png)

* 监控：Sentinel会不断检查master和slave是否按照预期工作。
* 自动故障恢复：如果master故障。Sentinel会将一个slave升级成master。当老master恢复后，也还是以新的master为主。
* 通知：Sentinel充当Redis客户端的服务发现，当集群发生故障转移时，会将最新的信息推送给Redis客户端。

## 哨兵如何判断实例是否下线

Sentinel基于心跳机制检测服务状态，每1秒钟向集群的每个实例发送ping命令：

* 主观下线：如果某sentinel节点发现某实例未在规定时间响应，则认为该实例主观下线。
* 客观下线：若超过指定数量（quorum）的sentinel都认为该实例主观下线，则该实例客观下线。qourum值最好超过Sentinel实例的一半。

![image-20240122175831589](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20240122175831589.png)

## master选举规则

* 首先判断slave节点和master节点断开时间的长短，如果超过指定值（down-after-milliseconds*10）则会排除该slave节点。
* 然后判断slave节点的slave-priority值（默认是1），越小优先级越高，如果是0则永不参与选举。
* 如果slave-priority一样，就判断slave节点的offset值，越大说明越新，优先级越高。
* 最后判断slave节点运行id大小，越小优先级越高。（相当于随便选一个）。

所以判断顺序大概是：slave-priority > offset。

## 故障转移步骤

* sentinel 给备选节点发送 slaveof no one 命令，让该节点成为master。
* sentinel 给所有其他slave发送slaveof <自己ip> <自己port> 命令，让这些slave成为新master的从节点，开始从新的master上同步数据。
* 最后，sentinel 将故障节点标记为slave，当故障节点恢复后会自动成为新的master的slave节点。

 ![image-20230911171230846](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230911171230846.png)

## 哨兵集群搭建

sentinel.conf文件：

```shell
# 配置哨兵实例的端口
port 27001
# 配置自己的ip地址
sentinel announce-ip 192.168.150.101
# 配置集群的名字（mymaster）和主节点地址和quorum值，这里是2
sentinel monitor mymaster 192.168.150.101 7001 2 
# slave和master断开的最长时间
sentinel down-after-milliseconds mymaster 5000
# slave故障恢复的超时时间
sentinel failover-timeout mymaster 60000
# 哨兵的工作目录
dir "/tmp/s1"
```

配置文件准备好后，使用如下命令启动哨兵：

```shell
redis-sentinel sentinel.conf
```

使用RedisTemplate客户端连接哨兵：

添加依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId></dependency>
```

在application.yml中添加配置：

```yaml
spring:
	redis:
		sentinel:
			master: mymaster # 指定master名称
			nodes: # 指定redis-sentinel集群信息
			- 192.168.150.101:27001
			- 192.168.150.101:27002
			- 192.168.150.101:27003
```

配置读写分离：

```java
@Bean
public LettuceClientConfigurationBuilderCustomizer configurationBuilderCustomizer(){
    return configBuilder -> configBuilder.readFrom(ReadFrom.REPLICA_PREFERRED);
}
```

RedisFrom是配置读取策略，有如下选择：

* MASTER：从主节点读取
* MASTER_PREFERRED：优先从master节点读取，master不可用才读取replica
* REPLICA：从slave节点读取
* REPLICA_PREFERRED：优先从slave节点读取，所有slave节点不可用才从master读取

RedisTemplate下面会维护一个连接池，和集群里的所有节点建立连接，最后执行查询的时候，会根据前面配置的策略来选择哪一个节点来执行。

# Redis分片集群

Redis为了保证主从数据同步的性能，单个节点的存储大小不能过大，这就限制了Redis的存储能力，并且只有master能够写数据，Redis分片集群就是为了解决这个问题。

Redis分片集群，即Redis Cluster，是Redis 3.0开始引入的分布式存储方案。

其实是基于前面的主从方案的拓展，我们有多个主从集群一起组成Redis分片集群，将数据分散存储到不同的主从集群当中，实现数据的分布式存储。

分片集群的结构特征：

* 集群中有多个master，每个master保存不同数据。
* 每个master都可以有多个salve节点。
* master之间通过ping检测彼此的健康状态，和哨兵一样。
* 客户端请求可以访问集群任意节点，最终都会被路由到正确节点

![image-20230911182712515](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230911182712515.png)

## 搭建分片集群

redis.conf配置文件：

```shell
port 6379
# 开启集群功能
cluster-enabled yes
# 集群的配置文件名称，不需要我们创建，由redis自已维护
cluster-config-file /tmp/6379/nodes.conf
# 节点心跳失败的超时时间
cluster-node-timeout 5000
# 持久化文件存放目录
dir /tmp/6379
# 绑定地址
bind 0.0.0.0
# 让redis后台运行
daemonize yes
# 注册的实例ip
replica-announce-ip 192.168.150.101
# 保护模式
protected-mode no
 #数据库数量
databases 1
# 日志
logfile /tmp/6379/run.log
```

然后通过配置文件启动redis实例：

```shell
redis-server redis.conf
```

这样就启动了一个redis实例，我们需要启动多个这样的实例，来搭建分片集群。

在启动多个实例之后，实例之间并没有任何联系，我们需要建立联系，在Redis5.x之后，集群管理可以通过redis-cli来设置：

```shell
redis-cli --cluster create --cluster-replicas 2 ip1:port1 ip2:port2 ...
```

* `redis-cli --cluster` ：操作集群命令
* `create` ：创建集群
* `--replicas 2 或者 `--cluster-replicas 2 ：指定集群中每个master的副本个数为2（即每个主节点有2个从节点），此时，`节点数 ÷ (replicas + 1)` 得到的就是master的数量。因此节点列表中的前n个就是master，其他几点都是salve，随机分配到不同的master。

查看集群状态：

```shell
redis-cli -p 随便一个节点的端口 cluster nodes
```

当我们客户端连接并使用分片集群的时候，需要加上一个-c参数，否则就还是单机模式：

```shell
# 需要加上一个-c参数，否则就还是单机模式
redis-cli -c -p 集群任意端口
```



## 散列插槽

Redis会把每个master节点映射到0~16383插槽上，查看集群信息是就能看到：

![image-20230911185123994](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230911185123994.png)

数据的key不与节点绑定，而是与插槽绑定，因为节点是会宕机转移的。redis会根据key的有效部分计算插槽值，有有效部分分两种情况：

* key中包含"{}"，且"{}"中至少包含一个字符，"{}"中的部分是有效部分
* key中不包含"{}"，整个key都是有效部分

计算方式是利用CRC16算法得到一个hash值，然后对16384求模。

## 集群伸缩

动态的增加节点和删除节点，实现集群的动态扩容和缩容。

节点添加命令如下：

```shell
redis-cli --cluster add-node
```

有如下参数：

| 参数                        | 解释                                   |
| --------------------------- | -------------------------------------- |
| new_host:new_port           | 新节点地址，即被添加节点的地址         |
| existing_host:existing_port | 集群里一个存在的节点地址，用来通知集群 |
| --cluster-slave             | 可选参数，设置为从节点，默认是主节点   |
| --cluster-master-id         | 可选参数，指定主节点i实例的d           |

新添加的master节点是没有插槽的，我们需要给他分配一个插槽。

分配插槽命令：

```shell
redis-cli --cluster reshard host:port
```

这里指定的地址并不是插槽的分配目标，只要是集群内任意一个地址就行。
然后控制台会展示交互界面：

```shell
# 询问你想分配多少插槽，这里输入3000
How many slots do you want to move (from 1 to 16384)? 3000
# 询问你想分配给哪一个节点，这里输入了目标实例的id：60826ceoba7be1
What is the receiving node ID? 60826ceoba7be1
# 询问你从哪些实例上面去copy数据，输入done结束
Please enter all the source node IDs.
Type 'all' to use all the nodes as source nodes for the hash slots.
Type 'done' once you entered all the source nodes IDs.
Source node #1: 
```

## 故障转移

### 自动故障转移

当集群中有一个master宕机，就会与集群其他实例失去连接。

然后集群判断该节点疑似宕机：

![image-20230912142820965](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912142820965.png)

最后确实真的下线了，自动提升一个slave为新的master：

![image-20230912142848891](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912142848891.png)

### 手动故障转移（cluster failover）

有可能某个master节点需要做维护，或者更换一个更强的节点，这个时候我们就需要手动故障转移。

首先，我们需要开启一个新的Redis实例，然后将它加入到集群中，作为被替换master节点的slave节点，如何指定master节点在集群伸缩里面已经讲过了。

这波属于是，先当奴才，后谋反。

然后在新Redis节点，执行cluster failover命令，可以手动让自己的master节点变成slave，然后自己成为master节点，实现无感知的数据迁移：

* 首先slave节点发送cluster failover命令给master
* master接到命令后，会阻塞所有客户端的请求，准备开始工作交接
* 然后master发送自己的offset给slave
* slave开始同步master的数据到一致
* 数据一致后，开始故障转移，两者身份互换
* 身份互换完成，开始在集群里面广播互换之后的结果，通知所有的节点

![image-20230912143410498](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912143410498.png)

自动故障转移是为了避免突然宕机造成的数据损失，手动故障转移是有目的性的去做一个数据迁移或者是服务升级。

# 缓存同步

|          | 内存淘汰                                                     | 超时剔除                              | 主动更新                   |
| -------- | ------------------------------------------------------------ | ------------------------------------- | -------------------------- |
| 说明     | 不用自己维护，利用Redis的淘汰机制，内存不足自动淘汰，然后下次查询时落库，就会更新缓存。 | 给缓存添加TTL过期时间，到期自动淘汰。 | 在改数据库的同时，更改缓存 |
| 一致性   | 差                                                           | 一般                                  | 好                         |
| 维护成本 | 无                                                           | 低                                    | 高                         |

业务场景：

* 低一致性需求：使用内存淘汰和超时剔除，例如店铺类型的查询缓存。
* 高一致性需求：主动更新，超时剔除兜底，如店铺详情查询。

## 主动更新

### 同步双写

由缓存的调用者，在更新数据库的同时更新缓存。

### 异步通知

调用者只操作缓存，由其他线程异步将数据落库，保证最终一致性。

#### 基于MQ的异步通知

![image-20230912152457756](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912152457756.png)

### 操作缓存和数据库时三个问题

1、删除缓存还是更新缓存？

* 更新缓存：每次更新数据库都改缓存，造成很多无效写操作。
* 删除缓存，更新数据库之后删除缓存，查询的时候再push到缓存。

2、如何保证缓存与数据库的操作的同时成功或失败？

* 单体系统：缓存和数据库操作放在一个事务
* 分布式系统：利用TCC等分布式事务方案

3、先操作缓存还是先操作数据库？

![image-20230907113428964](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/imageimage-20230907113428964.png)

## Canal

通过MQ进行异步通知，我们需要修改业务代码往MQ里面发送消息，而Canal可以实现无代码侵入的方式实现异步通知，它基于mysql主从同步的原理，监听数据库的变更，从而实现异步通知：

![image-20230912152624762](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912152624762.png)

MySQL主从同步：

* master将数据变更写入二进制日志（binlog），其中记录的数据叫做binary log events
* slave将master的binary log events拷贝到它的中继日志（relay log）
* slave重放realy log中的事件，将数据变更反映到自己的数据

![image-20230912153117968](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912153117968.png)

Canal会伪装成slave，一直监听MySQL master的binlog变化，再把变化消息通知给Canal客户端，进而完成对其他数据库的同步。

![image-20230912153825051](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912153825051.png)

### 安装Canal

#### 开启MySQL主从

Canal是基于MySQL主从同步功能实现的，所以必须开启MySQL的主从同步。

首先要开启binlog日志，编辑mysql配置文件`/tmp/mysql/conf/my.cnf`：

```shell
# 添加内容：

# 配置binlog的存放位置
log-bin=/var/lib/mysql/mysql-bin
# 指定binlog监听的数据库
binlog-do-db=数据库名称
```

添加用于数据同步的账户，设置用户权限

```sql
# 创建新用户
create user canal@'%' IDENTIFIED by'canal';
# 给新用户授权
GRANT SELECT，REPLICATION SLAVE，REPLICATION CLIENT,SUPER ON *.* TO 'canal'@'%' identified by 'canal';
# 刷新权限
FLUSH PRIVILEGES;

# 然后重启MySQL服务
```

主从同步开启之后，就开始安装Canal，安装的时候，需要设置Canal实例名称，配置上面添加的账户，需要监听的数据库等等，然后Canal就会去连接MySQL，然后去监听binlog日志。

这里不给出Canal的安装教程了。

### 使用Canal客户端

Canal提供了各种语言的客户端，当Canal服务监听到binlog变化时，就会通知Canal的客户端。

官方客户端很难用，这里有一个开源的第三方客户端：

```xml
<dependency>
    <groupId>top.javatool</groupId>
    <artifactId>canal-spring-boot-starter</artifactId>
    <version>1.2.1-RELEASE</version>
</dependency>
```

配置：

```yaml
canal:
	destination: 实例名称 # canal实例名称，要跟canal-server运行时设置的destination一致
	server: 192.168.15.11:11111 # canal地址
```

编写监听器，监听Canal消息：

```java
//指定监听的表名
@CanalTable("tb_item")
@Component
//Canal客户端会把监听到的数据封装成Item实体类，Item由我们自己实现
public class ItemHandler implements EntryHandler<Item>{
    @Override
    public void insert(Item item) {
        // 新增数据到redis
    }
	@Override
    public void update(Item before, Item after) {
        //更新redis数据
        //更新本地缓存
    }
	@Override
    public void delete(Item item) {
        // 删redis数据
        // 清理本地缓存
    }
}
```

Item实体类的编写：

![image-20230912161739062](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/image-20230912161739062.png)

# Redis实践

## Redis键值设计

### 优雅的Key结构

Redis最好遵循下面的实践约定：

* 遵循基本格式：[业务名称]:[数据名]:[id]
  1. 可读性强
  2. 避免key冲突
  3. 方便管理
* 长度不超过44字节
  1. 长度越小，占用空间越小，满足业务的情况下，尽可能小
  2. string底层编码分为三种：int、embstr和raw。embstr在小于44字节使用，会采用连续空间（Redis6.x版本），内存占用更小，否则就会改为raw编码，空间不连续。

* 不包含特殊字符

### 拒绝BigKey

BigKey通常以Key的大小和成员数量来综合判定：

* Key本身大小超过5M。
* Key成员数量过多，zset的成员数量超过10000个。
* Key成员中数据量过大，例如Hash成员数量虽然只有1000，但是总大小超过了100M。

推荐值：

* 单个key的value小于10KB。
* 集合元素小于1000。

查看key成员内存占用大小的命令：

```shell
# 在redis客户端里面输入：
memory usage key名称
# 返回成员占用大小，单位：字节
```

BigKey的危害：

* 网络阻塞：对于BigKey的读请求，传输数据大，少量的QPS就可能导致带宽使用率被占满，导致Redis实例甚至物理机变慢。
* Redis阻塞：对于元素较多的key做运算时，耗时较久，使主线程阻塞。
* CPU压力：BigKey的序列化和反序列化会导致CPU的使用率飙升，影响Redis实例和本机其他应用。
* 数据倾斜：BigKey所在的实例内存使用率远超其他实例，无法使数据分片的内存资源达到均衡。

发现BigKey：

* redis-cli --bigkeys

  可以遍历分析所有key，并返回key的整体统计信息，和每个数据类型占用的Top 1 的key。

* scan扫描

  自己编程，利用scan扫描Redis中的所有key，利用strlen、hlen等命令判断key的长度（不建议使用 memory usage）。

* 第三方工具

  Redis-Rdb-Tools分析RDB快照文件，全面分析内存使用情况

* 网络监控

  自定义工具，监控Redis进出的网络数据，超出预警值时主动告警

如果BigKey占用内存过多，删除的时候也会占用大量时间，所以我们要一点点删除，如一点点移除list的成员，最后再整个删除lsit。

但是如果是Redis4.x之后的版本，Redis提供了异步删除的命令：unlink，使用额外线程，避免了主进程阻塞导致业务暂停。

### 恰当的数据类型

存储一种对象有三种方式：

| 存储方式                                    | 优点                             | 缺点                                           |
| ------------------------------------------- | -------------------------------- | ---------------------------------------------- |
| json字符串                                  | 实现简单粗暴                     | 数据耦合，修改和删除字段需要覆盖整个json字符串 |
| 字段打散，对象的每个字段都用一个key分开存储 | 可以灵活访问和修改对象任意字段   | 占用空间大，没办法统一控制管理                 |
| 使用hash存储对象的字段                      | 速度快，可以灵活访问对象任意字段 | 代码实现复杂                                   |

所以建议使用hash保存对象。

## 批处理优化 

### Pipeline

网络延迟是在毫秒级别，内存处理是在微秒级别，所以尽量一次执行多次操作（利用批量操作命令，就是那些命令里带m的命令），减少网络传输的时间消耗。但是一次性也不能传输太多，否则占用带宽过多，导致网络阻塞。

但是原生的批处理命令，只能一次性处理同一种类型的，如mset、hmset，还有一些类型没有提供批处理命令，要是数据比较复杂，原生的命令就难以实现批处理了，所以一些Redis客户端给我们提供了Pipeline。

Pipeline允许我们塞入多任意的条命令，然后一次性发送给服务端，非常灵活：

```Java
@Test
void testPipeline() {
    // 创建管道
    Pipeline pipeline = jedis.pipelined();
    for (int i = 1;i<= 100000; i++) {
        // 放入命令到管道
        pipeline.set("test:key_" + i,"value" + i);
        if (i% 1000 == 0) {
            //批量执行,每放入1000条命令
            pipeline.sync();
        }
    }
}
```

### 集群下的批处理

在集群模式下使用批处理的时候，所有的key必须落在同一个插槽，否则执行失败。因为批处理操作需要在一次连接里面执行所有命令，如果不是在同一个插槽，那么就会保存到多个节点，就会涉及到多个连接。 

|          | 实现思路                                                     | 耗时                    | 优点             | 缺点                           |
| -------- | ------------------------------------------------------------ | ----------------------- | ---------------- | ------------------------------ |
| 串行命令 | for循环逐个命令去执行                                        | N次网络耗时+N次命令耗时 | 实现简单         | 耗时非常久                     |
| 串行slot | 在客户端计算出每个key的slot，然后根据slot分组，每个组串行依次进行批处理 | m+N                     | 耗时较短         | 实现稍复杂，slot越多，耗时越久 |
| 并行slot | 和串行的区别就是，每个slot分组都开一个线程并行发送，所以只需要一次网络耗时 | 1+N                     | 耗时短           | 实现复杂，需要消耗一定线程资源 |
| hash_tag | 每个key使用一样的hash_tag，则所有的slot一定相同              | 1+N                     | 耗时短，实现简单 | 很容易出现数据倾斜             |

推荐第三种方式。第四种虽然快，但是不推荐。

一些Redis客户端已经给我们提供了解决方案了，我们不需要手动去实现，SpringRedisTemplate实现的是并行slot方案。

## 服务端优化

### 持久化配置

持久化可以保证数据的安全，但是会带来很多额外的开销，所以持久化我们可以遵循下列建议：

* 用作缓存的Redis不建议开启持久化，因为是为了提高速度，数据在是存放在其他地方的。
* 建议关闭RDB，使用AOF，因为RDB间隔长，而且一次性保存所有数据，耗时长，消耗大量的磁盘IO，基于fork进程的CopyOnWrite机制，内存消耗大。RDB主要是手动用来做数据备份的。
* 使用AOF的时候，设置合理的rewrite阈值，避免频繁重写bgrewrite，消耗CPU资源。
* 配置no-appendfsync-on-rewrite = yes，禁止在rewrite期间做aof，抢占rewrite的IO资源引起阻塞。但是这样rewrite期间不会aof，对数据安全有一定影响，所以在安全和性能方面，自己要做一个权衡。

部署相关建议

* 预留足够内存，应对fork和rewrite。
* 单个Redis实例内存上限不要太大（4G或8G），可以加快fork的速度，减少主从同步和数据迁移的压力。
* 不要和CPU密集型的实例部署在一起。
* 不要和硬盘高负载的实例部署在一起（MySQL、MQ）。

### 慢查询

执行时间超过某个阈值（slowlog-log-slower-than，单位微妙，默认10000，建议1000）的命令，就是慢查询。慢查询会导致主线程阻塞，影响性能。

慢查询会被放入慢查询日志，本质是一个队列，默认长度128（slowlog-max-len），建议1000。

### 命令及安全配置

可以通过Redis，将自己的ssh公钥保存到服务器，从而实现服务器的免密登录，侵入服务器。

该安全问题出现的原因有一下几点：

* Redis未设置密码（可以直接操作Redis）
* 利用Redis的config set修改Redis配置
* 使用Root账号启动Redis（Redis有root权限，可以对系统做任意修改）

防止安全问题的建议：

* 一定要设置密码（要足够复杂，因为Redis很快，所以暴力破解也很快）。
* 不要使用Root账号启动Redis（建议单建立一个Redis账号）。
* 线上模式，禁用下列命令：keys、flushall、flushdb、config set等（可以对命令进行重命名）。 
* bind：限制网卡，禁止外网网卡访问，开启防火墙。
* 尽量不要用默认端口。

### 内存配置

当Redis内存不足，会使用Redis的内存淘汰策略，可能导致Key被频繁删除，响应时间边长，QPS不稳定。

当内存占用了90%，我们需要快速定位到内存占用的原因。

| 内存占用   | 说明                                                         |
| ---------- | ------------------------------------------------------------ |
| 数据内存   | 存放Redis的键值信息，主要问题是BigKey和内存碎片问题          |
| 进程内存   | 代码、常量池等，大约占几兆，可以忽略                         |
| 缓冲区内存 | 客户端输入输出（存放网络交互数据）、AOF、复制等缓冲区。波动较大，BigKey可能会导致内存溢出 |

主要关注数据内存和缓冲区内存。

内存状态查看命令：

info memory：查看内存相关信息

memory xxx：查看某一个key或者内存统计（stats）信息

## 集群的一些问题

### 插槽全覆盖

Redis集群为了保证数据的完整性，如果某一个插槽不可用（插槽对应的实例挂了），导致数据不完整，整个集群就会停止对外服务。

但是开发场景更看重可用性，某一部分业务不可用，我们可以去做一些熔断和降级，但是直接停掉所有业务，是非常不建议的。

Redis给我们提供了配置，可以关闭插槽全覆盖的功能：cluster-require-full-coverage，默认是yes，改成no就行。

### 带宽问题

集群模式没有哨兵，通过节点之间不断的互ping来确定集群的状态，每次ping都会携带插槽信息和集群状态信息。

集群节点越多，ping携带的数据也就越大，10个节点就可能达到1kb，此时集群互ping的带宽就很高了。

* 避免大集群（少于1000个节点），业务庞大，建立多个集群。
* 避免单个物理机运行太多Redis实例（最多10个左右），每个实例都会ping，导致带宽翻倍。
* 配置合适的cluter-node-timeout值（客观下线超时时间）。

### 事务和lua脚本问题

还有数据倾斜问题、客户端性能问题、命令的集群兼容性问题、lua和事务问题。

集群模式下没办法运行lua和事务，因为可能会涉及到不同的slot，原理和批处理是一样的。

单体Redis已经能够达到万级别的QPS，并且也具备很高的可用性。国内90%的业务QPS都达不到数万，如果主从能够满足业务需求，尽量不要搭建Redis集群。

