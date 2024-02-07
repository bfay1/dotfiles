from _typeshed import SupportsWrite, Unused

from .Image import Image

class PSDraw:
    fp: SupportsWrite[bytes]
    def __init__(self, fp: SupportsWrite[bytes] | None = None) -> None: ...
    isofont: dict[bytes, int]
    def begin_document(self, id: Unused = None) -> None: ...
    def end_document(self) -> None: ...
    def setfont(self, font: str, size: int) -> None: ...
    def line(self, xy0: tuple[int, int], xy1: tuple[int, int]) -> None: ...
    def rectangle(self, box: tuple[int, int, int, int]) -> None: ...
    def text(self, xy: tuple[int, int], text: str) -> None: ...
    def image(self, box: tuple[int, int, int, int], im: Image, dpi: float | None = None) -> None: ...

EDROFF_PS: bytes
VDI_PS: bytes
ERROR_PS: bytes