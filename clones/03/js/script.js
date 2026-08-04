document.addEventListener('click', function (e) {
    if (e.target / closest('a[href="#"]')) {
        e.preventDefault();
    }
});

$(function () {
    $('.visual .slide').slick({
        arrows: true,  //화살표
        dots: false, //인디케이트 해제
        fade: true,//페이드효과
        autoplay: true, //자동재생
        autoplaySpeed: 4000, //재생시간
        pauseOnHover: false,
        pauseOnFocus: false
    });
});

// fixHeader 이벤트

// ---- 기존 jQuery 코드 (주석 처리) ----
/*
var scrollTop = 0;
//console.log (scrollTop);

scrollTop = $(document).scrollTop();
fixHeader();

$(window).on('scroll resize', function () {
    scrollTop = $(document).scrollTop();
    fixHeader();
})

function fixHeader() {
    if (scrollTop > 150) {
        $('header').addClass('on')
    } else {
        $('header').removeClass('on')
    }
}
*/
// ----------------------------------------

// ---- Vanilla JS(순수 자바스크립트) 변환 코드 ----

// 스크롤 위치를 저장할 변수를 선언합니다. 초기값은 0입니다.
let scrollTop = 0;

// 웹페이지가 처음 로딩될 때 현재의 세로 스크롤 위치를 가져와서 변수에 저장합니다.
// window.scrollY를 지원하지 않는 브라우저를 위해 document.documentElement.scrollTop을 함께 사용합니다.
scrollTop = window.scrollY || document.documentElement.scrollTop;

// 스크롤 위치에 따라 헤더의 스타일을 바꾸는 함수를 최초 1회 실행합니다.
fixHeader();

// 사용자가 화면을 스크롤(scroll)하거나 브라우저 창 크기를 변환(resize)할 때마다 
// 상태를 업데이트하는 함수를 연결합니다.
window.addEventListener('scroll', updateScrollAndHeader);
window.addEventListener('resize', updateScrollAndHeader);

// 스크롤이나 창 크기가 변할 때 실행될 함수입니다.
function updateScrollAndHeader() {
    // 현재의 세로 스크롤 위치를 다시 가져와서 업데이트합니다.
    scrollTop = window.scrollY || document.documentElement.scrollTop;
    // 변경된 스크롤 위치를 바탕으로 헤더 스타일을 다시 적용합니다.
    fixHeader();
}

// 스크롤 위치를 확인해서 헤더에 'on' 클래스를 추가하거나 제거하는 함수입니다.
function fixHeader() {
    // 문서에서 <header> 요소를 찾아서 가져옵니다.
    const header = document.querySelector('header');

    // <header> 요소가 정상적으로 존재하는지 확인합니다. (에러 방지용)
    if (header) {
        // 스크롤이 위에서부터 150px보다 많이 내려왔다면
        if (scrollTop > 150) {
            // 헤더 요소에 'on' 이라는 클래스를 추가합니다. (예: css에서 배경색 변경 등을 적용할 수 있음)
            header.classList.add('on');
        } else {
            // 스크롤이 150px 이하로 다시 올라가면
            // 헤더 요소에서 'on' 클래스를 지웁니다. (원래 상태로 복구)
            header.classList.remove('on');
        }
    }
}

// gnbMenu (메뉴 열기/닫기 이벤트)

// ---- 기존 jQuery 코드 (주석 처리) ----
/*
$(function () {
    $('.menuOpen').on('click', function () {
        $('.gnb').addClass('on');
    })

    $('.close').on('click', function () {
        $('.gnb').removeClass('on')
    })
});
*/
// ----------------------------------------

// ---- Vanilla JS(순수 자바스크립트) 변환 코드 ----

// HTML 문서(DOM)가 모두 로드된 후에 내부의 코드를 실행합니다.
// (jQuery의 $(function(){ ... }) 부분과 동일한 역할을 합니다.)
document.addEventListener('DOMContentLoaded', function () {
    
    // 조작할 요소(태그)들을 문서에서 찾아 변수에 저장해 둡니다.
    const menuOpenBtn = document.querySelector('.menuOpen'); // 메뉴 열기 버튼
    const closeBtn = document.querySelector('.close');       // 메뉴 닫기 버튼
    const gnb = document.querySelector('.gnb');              // 메뉴 전체 영역

    // 에러를 방지하기 위해, 열기 버튼과 메뉴 영역이 실제로 화면에 있는지 확인 후 실행합니다.
    if (menuOpenBtn && gnb) {
        // 열기 버튼을 '클릭(click)'했을 때 실행될 동작을 지정합니다.
        menuOpenBtn.addEventListener('click', function () {
            // 메뉴 영역(gnb)에 'on' 이라는 클래스를 추가합니다. (메뉴가 화면에 나타남)
            gnb.classList.add('on');
        });
    }

    // 에러를 방지하기 위해, 닫기 버튼과 메뉴 영역이 실제로 화면에 있는지 확인 후 실행합니다.
    if (closeBtn && gnb) {
        // 닫기 버튼을 '클릭(click)'했을 때 실행될 동작을 지정합니다.
        closeBtn.addEventListener('click', function () {
            // 메뉴 영역(gnb)에서 'on' 이라는 클래스를 제거합니다. (메뉴가 화면에서 사라짐)
            gnb.classList.remove('on');
        });
    }
});

//top버튼 상단으로 부드럽게 이동
$(function () {
    $('.goTop').on('click', function () {
        const top = $('body').offset().top;
        //offset함수는 원하는 선택자의 위칫값을 .top .left을 반환하는 함수

        $('html, body').animate({ scrollTop: (top) }, 800);
    })
})