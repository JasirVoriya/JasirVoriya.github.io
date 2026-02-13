---
title: Inotify介绍与使用
tags: 
  - C++
  - Linux
  - inotify
---
# Inotify介绍与使用

## 简介

Inotify是一个Linux内核特性，提供了一种机制，允许应用程序监视文件系统事件。它在Linux内核2.6.13中引入，并自那时起在多个Linux发行版中可用。Inotify可以用来监控单个文件，或者监控目录下的所有文件的变化。

使用inotify时，应用程序首先需要初始化一个inotify实例，然后可以向这个实例添加一个或多个“监视项”（watches）。每个监视项与一个文件或目录关联，并指定要监视哪些类型的事件，例如文件被创建、删除、修改或访问。

当这些文件系统事件发生时，inotify会通知应用程序。这允许应用程序实时响应文件系统变化，这可能对于需要实时数据同步的系统、实时备份服务或者用户界面（如文件管理器）展示最新文件信息的场合非常有用。

inotify API 主要包含以下几个系统调用：

- `inotify_init()` 或 `inotify_init1()`: 用于初始化一个新的inotify实例，返回一个文件描述符。
- `inotify_add_watch()`: 在inotify实例上添加一个新的监视项。
- `inotify_rm_watch()`: 从inotify实例中移除一个监视项。

inotify使用非常直观，但它也有一些限制，例如对于大量并发监视的资源消耗问题，以及它不能递归监视一个目录树中的所有子目录。对于后者，用户可能需要使用额外的逻辑来为目录树中的每个目录添加监视项，或者使用其他工具和解决方案，例如`fanotify`或`FSEvents`（在macOS中）。

## 代码

```c++
#include <sys/inotify.h>
#include <cstdio>
#include <iostream>
#include <cstdlib>
#include <unistd.h>
using namespace std;
int main(void)
{
  int fd = inotify_init(); // 初始化inotify实例
  if (fd < 0)
  {
    perror("inotify_init");
    exit(EXIT_FAILURE);
  }
  // 监听目录下的变化
  int wd = inotify_add_watch(fd, "/root/temp", IN_MODIFY | IN_CREATE | IN_DELETE);
  if (wd == -1)
  {
    perror("inotify_add_watch");
    close(fd);
    exit(EXIT_FAILURE);
  }
  const int event_size = sizeof(inotify_event);
  const int buf_len = 1024 * (event_size + 16);
  char buf[buf_len];

  while (true)
  {
    int length = read(fd, buf, buf_len);
    if (length < 0)
    {
      perror("read");
      exit(EXIT_FAILURE);
    }

    int i = 0;
    while (i < length)
    {
      struct inotify_event *event = (struct inotify_event *)&buf[i];
      if (event->len)
      {
        if (event->mask & IN_CREATE)
        {
          printf("The file %s was created.\n", event->name);
        }
        else if (event->mask & IN_DELETE)
        {
          printf("The file %s was deleted.\n", event->name);
        }
        else if (event->mask & IN_MODIFY)
        {
          printf("The file %s was modified.\n", event->name);
        }
      }
      i += event_size + event->len;
    }
  }

  // 清理工作
  inotify_rm_watch(fd, wd);
  close(fd);

  return 0;
}
```

`const int buf_len = 1024 * (event_size + 16)`这里的+16是因为，`inotify_event`里面的name是一个柔性数组，这16个字节是留给name使用的：

### inotify.h：

```c++
/* Structure describing an inotify event.  */
struct inotify_event
{
  int wd;		/* Watch descriptor.  */
  uint32_t mask;	/* Watch mask.  */
  uint32_t cookie;	/* Cookie to synchronize two events.  */
  uint32_t len;		/* Length (including NULs) of name.  */
  char name __flexarr;	/* Name.  */
};
```

### cdefs.h：

```c++
/* GCC 2.97 and clang support C99 flexible array members as an extension,
   even when in C89 mode or compiling C++ (any version).  */
# define __flexarr	[]
```

在C99标准中，柔性数组成员是结构体中的最后一个元素，允许结构体具有可变大小的数组。这种数组成员没有指定长度，使得结构体能够动态地拥有更多的数组元素。这在需要结构体持有不同数量元素的情况下非常有用，常见于需要处理不确定数量数据的场景。
